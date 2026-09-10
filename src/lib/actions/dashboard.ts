'use server'
import { getDashboardStats } from './dashboard-stats'
import { readDashboardCovers } from '@/lib/dashboard-covers'
import { readDashboardUpdates } from '@/lib/dashboard-updates'
import { getAllVotes } from './votes'
import { getDispatchDashboard } from './signal-tasks'
import { createClient } from '@/lib/supabase/server'
import { dashboardEventVotes, dashboardTuningWorlds, latestUpdates, orderDashboardEvents, type DashboardEvent } from '@/lib/dashboard-model'
export async function getDashboard() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  const { data: profile } = user ? await client.from('voyager_profiles').select('role, display_name, avatar_url').eq('id', user.id).single() : { data: null }
  const role = profile?.role ?? 'guest'
  const errors: string[] = []
  async function read<T>(name: string, task: () => Promise<T>): Promise<T | null> { try { return await task() } catch { errors.push(name); return null } }
  const [feed, votes, dispatch, responses, stats] = await Promise.all([
    read('Updates', () => readDashboardUpdates(role === 'voyager' || role === 'architect')),
    read('Votes', getAllVotes), read('Signal Dispatch', () => getDispatchDashboard(true)),
    user ? read('Vote responses', async () => {
      const { data, error } = await client.from('vote_responses').select('vote_id').eq('user_id', user.id)
      if (error) throw error
      return data ?? []
    }) : Promise.resolve([]),
    read('Statistics', getDashboardStats),
  ])
  if (feed?.incomplete) errors.push('Updates')
  const covers = dispatch?.openWorlds.length ? await read('Event images', readDashboardCovers) : null
  const events: DashboardEvent[] = []
  for (const vote of dashboardEventVotes(votes ?? [], role, responses ?? [], Date.now(), !user)) events.push({id:`vote-${vote.id}`,kind:'Vote Open',title:vote.title,description:vote.description ?? 'Community choice open.',href:'/vote',action:'View and vote',endsAt:vote.ends_at})
  for (const world of dashboardTuningWorlds(dispatch?.openWorlds ?? [], dispatch?.awaitingWorldIds ?? [], !user)) events.push({ id:`tuning-${world.id}`,kind:'Signal Tuning',title:world.name,description:'A signal is open for tuning.',href:`/worlds/${encodeURIComponent(world.id)}`,action:'Tune signal',image:covers?.[world.id] })
  return { voyager: user ? { role, name: profile?.display_name ?? 'Voyager', avatarUrl: profile?.avatar_url ?? null, awaitingYou: dispatch?.awaitingYou ?? null, deviceDays: 0 } : null, stats, updates: latestUpdates(feed?.updates ?? []), events: orderDashboardEvents(events), errors, guest: !user, fetchedAt: new Date().toISOString() }
}
