import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'
import { roundVoteAccess, type RoundStatus, type RoundViewer } from './dreamcatcher-round-model'
import type { PublicInvestigation, PublicSignalAsset } from '@/lib/actions/signal-tasks'

// The additive migration is not represented in the generated database types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createAdminClient() as any
export interface RoundRecord {
  id: string
  world_id: string
  dreamcatcher_id: string
  initiator_id: string
  round_number: number
  status: RoundStatus
  task_id: string | null
  opened_at: string | null
  closes_at: string | null
}
type WorldRow = { id: string; name: string; discoverer_name: string; discoverer_id: string | null; vote_scope: 'self' | 'all' | 'voters'; lifecycle_state: string }
type TaskRow = { id: string; thread_id: string; prompt: string | null }
type ResponseRow = { task_id: string; user_id: string; selected_asset_id: string }
type AssetRow = PublicSignalAsset & { task_id: string }

async function readRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await page(from, from + 499)
    if (error) throw new Error('Parallax Array records are temporarily unavailable')
    rows.push(...(data ?? []))
    if (!data || data.length < 500) return rows
  }
}
function groupByTask<T extends { task_id: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const group = map.get(row.task_id) ?? []
    group.push(row)
    map.set(row.task_id, group)
  }
  return map
}

/** Public only after the atomic publication gate. Fallback rounds appear in the
 * original submitter's feed, and remain read-only in everyone else's history. */
export async function getRoundInvestigations(viewer: RoundViewer, worldId?: string, includeHistory = false): Promise<PublicInvestigation[]> {
  const admin = db()
  const rounds = await readRows<RoundRecord>((from, to) => {
    let query = admin.from('dreamcatcher_rounds')
      .select('id,world_id,dreamcatcher_id,initiator_id,round_number,status,task_id,opened_at,closes_at')
      .not('opened_at', 'is', null).order('round_number').order('id').range(from, to)
    if (worldId) query = query.eq('world_id', worldId)
    return query
  })
  if (!rounds.length) return []
  const investigations = new Map<string, PublicInvestigation>()
  const now = Date.now()
  // Bound PostgREST URL sizes and page every dataset, including vote counts.
  for (let offset = 0; offset < rounds.length; offset += 100) {
    const batch = rounds.slice(offset, offset + 100)
    const taskIds = batch.map(r => r.task_id).filter((id): id is string => !!id)
    const worldIds = [...new Set(batch.map(r => r.world_id))]
    const [worlds, tasks, assets, responses] = await Promise.all([
      readRows<WorldRow>((from, to) => admin.from('worlds').select('id,name,discoverer_name,discoverer_id,vote_scope,lifecycle_state').in('id', worldIds).order('id').range(from, to)),
      readRows<TaskRow>((from, to) => admin.from('signal_tasks').select('id,thread_id,prompt').in('id', taskIds).eq('is_published', true).order('id').range(from, to)),
      readRows<AssetRow>((from, to) => admin.from('signal_task_assets').select('id,task_id,media,processed_url,display_url,asset_role,display_order').in('task_id', taskIds).eq('is_selected', true).order('display_order').order('id').range(from, to)),
      readRows<ResponseRow>((from, to) => admin.from('signal_responses').select('task_id,user_id,selected_asset_id').in('task_id', taskIds).order('id').range(from, to)),
    ])
    const worldMap = new Map(worlds.map(w => [w.id, w]))
    const taskMap = new Map(tasks.map(t => [t.id, t]))
    const assetMap = groupByTask(assets)
    const responseMap = groupByTask(responses)
    for (const r of batch) {
      const w = worldMap.get(r.world_id)
      const task = r.task_id ? taskMap.get(r.task_id) : undefined
      if (!w || !task) continue
      const resp = responseMap.get(task.id) ?? []
      const access = roundVoteAccess({
        status: w.lifecycle_state === 'syncing' ? r.status : 'cancelled',
        openedAt: r.opened_at, closesAt: r.closes_at, participantCount: resp.length,
        initiatorId: r.initiator_id, discovererId: w.discoverer_id,
        voteScope: w.vote_scope, viewer, now,
      })
      let inv = investigations.get(w.id)
      if (!inv) {
        inv = {
          id: task.thread_id, worldId: w.id, title: w.name, discovererName: w.discoverer_name,
          type: 'visual_match', voteScope: w.vote_scope, canParticipate: false, lockReason: null,
          days: [], searching: null, dreamcatcherId: r.dreamcatcher_id, roundBased: true,
        }
        investigations.set(w.id, inv)
      }
      const mySelection = resp.find(s => s.user_id === viewer?.id)?.selected_asset_id ?? null
      const distribution: Record<string, number> = {}
      resp.forEach(s => { distribution[s.selected_asset_id] = (distribution[s.selected_asset_id] ?? 0) + 1 })
      inv.days.push({
        dayIndex: r.round_number - 1, revealAt: r.opened_at, revealed: true,
        task: {
          id: task.id, type: 'visual_match', prompt: task.prompt,
          assets: (assetMap.get(task.id) ?? []).map(a => ({ id: a.id, media: a.media, processed_url: a.processed_url, display_url: a.display_url, asset_role: a.asset_role, display_order: a.display_order })),
          participantCount: resp.length, mySelection,
          distribution: mySelection || !access.publicOpen || viewer?.role === 'architect' ? distribution : null,
          closed: !access.publicOpen && !access.canVote, closeAt: r.closes_at, thread: null,
          roundNumber: r.round_number, canRespond: access.canVote, initiatorOnly: access.initiatorOnly,
        },
      })
      inv.canParticipate = access.canVote
      inv.lockReason = access.initiatorOnly ? 'Voting closed — only the original submitter can continue.' : !viewer ? 'Log in to respond' : null
    }
  }
  return [...investigations.values()].filter(inv => includeHistory || inv.days.some(d => !d.task.closed))
}

export async function advanceDreamcatcherRounds() {
  const { error } = await db().rpc('advance_dreamcatcher_rounds')
  if (error) throw new Error(error.message)
}
