'use server'
import { getDashboardStats } from './dashboard-stats'
import { readDashboardCovers } from '@/lib/dashboard-covers'
import { readDashboardUpdates } from '@/lib/dashboard-updates'
import { getAllVotes } from './votes'
import { getDispatchDashboard } from './signal-tasks'
import { listDreamcatcherRooms } from '@/lib/dreamcatchers'
import { listPublicDeviceBatches } from '@/lib/device-batch-repository'
import { getBatchRemainingQuantity, getBatchClaimHref } from '@/lib/device-batches'
import { createClient } from '@/lib/supabase/server'
import { latestUpdates, visibleEventVotes, orderDashboardEvents, type DashboardEvent } from '@/lib/dashboard-model'
export async function getDashboard() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  const { data: profile } = user ? await client.from('voyager_profiles').select('role, display_name, avatar_url').eq('id', user.id).single() : { data: null }
  const role = profile?.role ?? 'guest'
  const errors: string[] = []
  async function read<T>(name: string, task: () => Promise<T>): Promise<T | null> { try { return await task() } catch { errors.push(name); return null } }
  const [feed, votes, dispatch, rooms, batches, stats] = await Promise.all([
    read('Updates', () => readDashboardUpdates(role === 'voyager' || role === 'architect')),
    read('Votes', getAllVotes), read('Signal Dispatch', () => getDispatchDashboard(true)),
    read('Dreamcatchers', listDreamcatcherRooms), read('Console claims', listPublicDeviceBatches),
    read('Statistics', getDashboardStats),
  ])
  if (feed?.incomplete) errors.push('Updates')
  const covers = dispatch?.openWorlds.length ? await read('Event images', readDashboardCovers) : null
  const events: DashboardEvent[] = []
  for (const world of dispatch?.openWorlds ?? []) events.push({ id:`dispatch-${world.id}`,kind:'Signal Dispatch',title:world.name,description:'Open for identification.',href:'/signal',action:'Identify signal',image:covers?.[world.id] })
  for (const vote of visibleEventVotes(votes ?? [], Date.now())) events.push({id:`vote-${vote.id}`,kind:'Collective vote',title:vote.title,description:vote.description ?? 'Community choice open.',href:'/vote',action:'View and vote',endsAt:vote.ends_at})
  for (const room of rooms ?? []) if (room.status !== 'offline' && room.status !== 'paused' && room.queue.length < room.queueCapacity) events.push({id:`dream-${room.id}`,kind:'Dreamcatcher',title:room.name,description:`Submit a dream to ${room.city}.`,href:'/worlds/live',action:'Submit dream',image:room.cameraImagePath})
  for (const batch of batches ?? []) if (batch.status === 'claim_open' && batch.claimHref && batch.claimPrice && (getBatchRemainingQuantity(batch) ?? 0) > 0) events.push({id:`claim-${batch.slug}`,kind:'Console claim',title:batch.name,description:batch.statusLine,href:getBatchClaimHref(batch)!,action:'View claim',image:batch.image})
  events.push({id:'world-submission',kind:'World submission',title:'Share a world',description:'Submit a world for review.',href:'/worlds/submit',action:'Submit world'})
  events.push({id:'quiz',kind:'Voyager quiz',title:'Find your signal',description:'Explore the Voyager entry assessment.',href:'/quiz',action:'Take quiz'})
  return { voyager: user ? { role, name: profile?.display_name ?? 'Voyager', avatarUrl: profile?.avatar_url ?? null, awaitingYou: dispatch?.awaitingYou ?? null, deviceDays: 0 } : null, stats, updates: latestUpdates(feed?.updates ?? [], votes ?? []), events: orderDashboardEvents(events), errors, guest: !user, fetchedAt: new Date().toISOString() }
}
