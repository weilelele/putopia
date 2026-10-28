'use server'
import { cache } from 'react'
import { getDashboardStats } from './dashboard-stats'
import { readDashboardCovers } from '@/lib/dashboard-covers'
import { readDashboardUpdates } from '@/lib/dashboard-updates'
import { getAllVotes } from './votes'
import { getDispatchDashboard } from './signal-tasks'
import { createClient } from '@/lib/supabase/server'
import { getRequestIdentity } from '@/lib/request-auth'
import { dashboardEventVotes, dashboardTuningWorlds, latestUpdates, orderDashboardEvents, type DashboardEvent } from '@/lib/dashboard-model'

const identity = cache(async () => {
  const { data: { user }, profile } = await getRequestIdentity()
  const role = profile?.role ?? 'guest'
  return {
    user, role,
    voyager: user ? { role, name: profile?.display_name ?? 'Voyager', avatarUrl: profile?.avatar_url ?? null, awaitingYou: null as number | null, deviceDays: 0 } : null,
    guest: !user,
  }
})

export async function getDashboardIdentity() {
  const { user, voyager, guest } = await identity()
  return { viewerId: user?.id ?? null, voyager, guest }
}

export async function getDashboardOverview() {
  try { return { stats: await getDashboardStats(), errors: [] as string[] } }
  catch { return { stats: null, errors: ['Statistics'] } }
}

export async function getDashboardUpdates() {
  const { role } = await identity()
  try {
    const feed = await readDashboardUpdates(role === 'voyager' || role === 'architect')
    return { updates: latestUpdates(feed.updates), errors: feed.incomplete ? ['Updates'] : [] }
  } catch { return { updates: [], errors: ['Updates'] } }
}

export async function getDashboardEvents() {
  const { user, role } = await identity()
  const client = await createClient()
  const errors: string[] = []
  async function read<T>(name: string, task: () => Promise<T>): Promise<T | null> {
    try { return await task() } catch { errors.push(name); return null }
  }
  // Warm covers alongside eligibility rather than starting after it finishes.
  const coversPromise = readDashboardCovers().then(data => ({ data, failed: false }), () => ({ data: null, failed: true }))
  const [votes, dispatch, responses, covers] = await Promise.all([
    read('Votes', getAllVotes),
    read('Signal Dispatch', () => getDispatchDashboard(true)),
    user ? read('Vote responses', async () => {
      const { data, error } = await client.from('vote_responses').select('vote_id').eq('user_id', user.id)
      if (error) throw error
      return data ?? []
    }) : Promise.resolve([]),
    coversPromise,
  ])
  if (dispatch?.openWorlds.length && covers.failed) errors.push('Event images')
  const events: DashboardEvent[] = []
  for (const vote of dashboardEventVotes(votes ?? [], role, responses ?? [], Date.now(), !user)) events.push({ id:`vote-${vote.id}`, kind:'Vote Open', title:vote.title, description:vote.description ?? 'Community choice open.', href:'/vote', action:'View and vote', endsAt:vote.ends_at })
  for (const world of dashboardTuningWorlds(dispatch?.openWorlds ?? [], dispatch?.awaitingWorldIds ?? [], !user)) events.push({ id:`tuning-${world.id}`, kind:'Signal Tuning', title:world.name, description:'A signal is open for tuning.', href:`/worlds/${encodeURIComponent(world.id)}`, action:'Tune signal', image:covers.data?.[world.id] })
  return { events: orderDashboardEvents(events), awaitingYou: dispatch?.awaitingYou ?? null, errors }
}

/** Complete snapshot retained for offline consumers; the route streams each section. */
export async function getDashboard() {
  const [viewer, overview, feed, participation] = await Promise.all([
    getDashboardIdentity(), getDashboardOverview(), getDashboardUpdates(), getDashboardEvents(),
  ])
  return {
    ...viewer,
    voyager: viewer.voyager ? { ...viewer.voyager, awaitingYou: participation.awaitingYou } : null,
    stats: overview.stats, updates: feed.updates, events: participation.events,
    errors: [...overview.errors, ...feed.errors, ...participation.errors],
    fetchedAt: new Date().toISOString(),
  }
}
