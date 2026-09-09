'use server'
import { getDashboardStats } from './dashboard-stats'
import { readDashboardCovers } from '@/lib/dashboard-covers'
import { readDashboardUpdates } from '@/lib/dashboard-updates'
import { getAllVotes, getMyVoteResponses } from './votes'
import { getDispatchDashboard } from './signal-tasks'
import { getApplicantTaskStatus } from './tasks'
import { listDreamcatcherRooms } from '@/lib/dreamcatchers'
import { listPublicDeviceBatches } from '@/lib/device-batch-repository'
import { getBatchRemainingQuantity, getBatchClaimHref } from '@/lib/device-batches'
import { getMyDeviceConsoles } from './orders'
import { createClient } from '@/lib/supabase/server'
import { latestUpdates, availableVotes, type DashboardEvent } from '@/lib/dashboard-model'
export async function getDashboard() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  const { data: profile } = user ? await client.from('voyager_profiles').select('role').eq('id', user.id).single() : { data: null }
  const role = profile?.role ?? 'guest'
  const errors: string[] = []
  async function read<T>(name: string, task: () => Promise<T>): Promise<T | null> { try { return await task() } catch { errors.push(name); return null } }
  const [feed, votes, responses, dispatch, rooms, batches, owned, tasks, stats] = await Promise.all([
    read('Updates', () => readDashboardUpdates(role === 'voyager' || role === 'architect')), read('Votes', getAllVotes), user ? read('Vote participation', getMyVoteResponses) : null,
    user ? read('Signal Dispatch', getDispatchDashboard) : null, user ? read('Dreamcatchers', listDreamcatcherRooms) : null,
    user ? read('Console claims', listPublicDeviceBatches) : null, user ? read('Owned Consoles', getMyDeviceConsoles) : null,
    role === 'applicant' ? read('Applicant tasks', getApplicantTaskStatus) : null,
    read('Statistics', getDashboardStats),
  ])
  if (feed?.incomplete) errors.push('Updates')
  const covers = dispatch?.awaitingYou ? await read('Event images', readDashboardCovers) : null
  const events: DashboardEvent[] = []
  if (dispatch && dispatch.awaitingYou > 0) events.push({ id:'dispatch',kind:'Signal Dispatch',title:'A signal is waiting for you',description:`${dispatch.awaitingYou} open question${dispatch.awaitingYou === 1 ? '' : 's'} you can answer.`,href:'/signal',action:'Identify signal',image:dispatch.awaitingWorldIds.map(id=>covers?.[id]).find(Boolean) })
  const vote = votes && responses ? availableVotes(votes, role, responses, Date.now())[0] : null
  if (vote) events.push({id:`vote-${vote.id}`,kind:'Collective vote',title:vote.title,description:vote.description ?? 'Make your choice in this open vote.',href:'/vote',action:'View and vote',endsAt:vote.ends_at})
  const room = rooms?.find(room => room.status !== 'offline' && room.status !== 'paused' && room.queue.length < room.queueCapacity)
  if (room && role !== 'guest') events.push({id:`dream-${room.id}`,kind:'Dreamcatcher',title:room.name,description:`Submit a dream to ${room.city}.`,href:'/worlds/live',action:'Submit dream',image:room.cameraImagePath})
  const batch = owned ? batches?.find(batch => batch.status === 'claim_open' && batch.claimHref && batch.claimPrice && (getBatchRemainingQuantity(batch) ?? 0) > 0 && !owned.some(item => item.order.device_batch_slug === batch.slug)) : null
  if (batch) events.push({id:`claim-${batch.slug}`,kind:'Console claim',title:batch.name,description:batch.statusLine,href:getBatchClaimHref(batch)!,action:'View claim',image:batch.image})
  if (events.length < 5 && tasks && !tasks.sighting) events.push({id:'world-submission',kind:'World submission',title:'Share a world',description:'Submit your first world for review.',href:'/worlds/submit',action:'Submit world'})
  if (events.length < 5 && tasks && !tasks.quiz) events.push({id:'quiz',kind:'Voyager quiz',title:'Find your signal',description:'Continue your entry assessment.',href:'/quiz',action:'Take quiz'})
  return { stats, updates: latestUpdates(feed?.updates ?? [], votes ?? []), events, errors, guest: !user, fetchedAt: new Date().toISOString() }
}
