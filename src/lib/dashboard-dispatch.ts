import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from './supabase/server'
import type { RoundViewer } from './dreamcatcher-round-model'
import { dashboardDispatch, latestDispatchRounds, type DispatchTask, type DispatchThread, type DispatchWorld, type DispatchRound } from './dashboard-dispatch-model'

async function readRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = []
  for (let from = 0; ; from += 500) {
    const result = await page(from, from + 499)
    if (result.error) throw result.error
    rows.push(...(result.data ?? []))
    if ((result.data?.length ?? 0) < 500) return rows
  }
}

/** Request-local, including all permissions and responses: never cache a viewer across requests. */
export async function readDashboardDispatch(viewerInput: RoundViewer | Promise<RoundViewer>) {
  const db = createAdminClient() as SupabaseClient
  // Independent datasets start together. No owner profiles, assets, distributions
  // or personal world library are needed to decide whether an event is open.
  const [tasks, threads, rounds, { viewer, responses }] = await Promise.all([
    readRows<DispatchTask>((from, to) => db.from('signal_tasks')
      .select('id,thread_id,day_index,published_at,dreamcatcher_round_id').eq('is_published', true)
      .not('thread_id', 'is', null).order('id').range(from, to)),
    readRows<DispatchThread>((from, to) => db.from('signal_threads')
      .select('id,world_id,reveal_anchor_at,gap_hours').order('id').range(from, to)),
    readRows<DispatchRound>((from, to) => db.from('dreamcatcher_rounds')
      .select('id,world_id,task_id,round_number,status,initiator_id,opened_at,closes_at')
      .not('opened_at', 'is', null).order('round_number').order('id').range(from, to)),
    Promise.resolve(viewerInput).then(async viewer => ({ viewer,
      responses: viewer ? await readRows<{ task_id: string }>((from, to) => db.from('signal_responses')
        .select('task_id').eq('user_id', viewer.id).order('id').range(from, to)) : [],
    })),
  ])
  const worldIds = [...new Set([...threads.flatMap(thread => thread.world_id ? [thread.world_id] : []), ...rounds.map(round => round.world_id)])]
  const roundIds = latestDispatchRounds(rounds, tasks).filter(round => ['voting_open', 'awaiting_initiator_feedback'].includes(round.status)).flatMap(round => round.task_id ? [round.task_id] : [])
  // Bound query URLs, and paginate large response sets rather than silently
  // treating Supabase's row limit as a complete participation count.
  const worlds: DispatchWorld[] = []
  const roundResponses: { task_id: string }[] = []
  await Promise.all([
    (async () => { for (let start = 0; start < worldIds.length; start += 100) {
      worlds.push(...await readRows<DispatchWorld>((from, to) => db.from('worlds')
        .select('id,name,discoverer_id,vote_scope,scan_until,lifecycle_state').in('id', worldIds.slice(start, start + 100)).order('id').range(from, to)))
    } })(),
    (async () => { for (let start = 0; start < roundIds.length; start += 100) {
      roundResponses.push(...await readRows<{ task_id: string }>((from, to) => db.from('signal_responses')
        .select('task_id').in('task_id', roundIds.slice(start, start + 100)).order('id').range(from, to)))
    } })(),
  ])
  return dashboardDispatch({ tasks, threads, rounds, worlds, responded: responses.map(response => response.task_id), roundResponses, viewer, now: Date.now() })
}
