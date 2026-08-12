import { createAdminClient } from '@/lib/supabase/server'

export type DreamcatcherStatus = 'processing' | 'paused' | 'idle' | 'offline' | 'awaiting_signal'
export type DreamcatcherJobStatus = 'queued' | 'processing' | 'awaiting_dispatch' | 'awaiting_vote' | 'returning' | 'completed' | 'withdrawn' | 'failed'

export type DreamcatcherJob = {
  id: string
  worldId: string
  title: string
  description: string
  submitter: string
  status: DreamcatcherJobStatus
  roundNumber: number
}

export type DreamcatcherRoom = {
  id: string
  slug: string
  code: string
  name: string
  city: string
  location: string
  timeZone: string
  status: DreamcatcherStatus
  roundDurationMinutes: number
  queueCapacity: number
  cameraImagePath: string
  queue: DreamcatcherJob[]
}

const FALLBACK_ROOMS: DreamcatcherRoom[] = [
  { id: 'fallback-kyoto', slug: 'kyoto-02', code: 'DC-KYO-02', name: 'Kyoto Dreamcatcher', city: 'Kyoto', location: 'Kyoto, Japan', timeZone: 'Asia/Tokyo', status: 'processing', roundDurationMinutes: 8, queueCapacity: 50, cameraImagePath: '/assets/concepts/dreamcatcher-live-feed.png', queue: [] },
  { id: 'fallback-tokyo', slug: 'tokyo-01', code: 'DC-TYO-01', name: 'Tokyo Dreamcatcher', city: 'Tokyo', location: 'Tokyo, Japan', timeZone: 'Asia/Tokyo', status: 'idle', roundDurationMinutes: 9, queueCapacity: 50, cameraImagePath: '/assets/concepts/dreamcatcher-live-feed.png', queue: [] },
  { id: 'fallback-london', slug: 'london-01', code: 'DC-LON-01', name: 'London Dreamcatcher', city: 'London', location: 'London, United Kingdom', timeZone: 'Europe/London', status: 'paused', roundDurationMinutes: 10, queueCapacity: 50, cameraImagePath: '/assets/concepts/dreamcatcher-live-feed.png', queue: [] },
]

const ROOM_PRIORITY = ['kyoto-02', 'tokyo-01', 'london-01', 'mexico-city-03']

export async function listDreamcatcherRooms(): Promise<DreamcatcherRoom[]> {
  // New migration may not be applied in every preview yet, so this read degrades
  // to the same rooms without making preview environments write production data.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: rooms, error } = await admin
    .from('dreamcatchers')
    .select('id, slug, code, name, city, location, time_zone, status, round_duration_minutes, queue_capacity, camera_image_path')
    .eq('is_public', true)
    .order('created_at', { ascending: true })
  if (error || !rooms?.length) return FALLBACK_ROOMS

  const { data: jobs } = await admin
    .from('dreamcatcher_jobs')
    .select('id, dreamcatcher_id, world_id, submitted_by, status, round_number, queued_at, worlds(name, description, discoverer_name)')
    .in('dreamcatcher_id', rooms.map((room: { id: string }) => room.id))
    .in('status', ['queued', 'processing', 'awaiting_dispatch', 'awaiting_vote', 'returning'])
    .order('queued_at', { ascending: true })

  const mappedRooms: DreamcatcherRoom[] = rooms.map((room: Record<string, unknown>) => ({
    id: room.id as string,
    slug: room.slug as string,
    code: room.code as string,
    name: room.name as string,
    city: room.city as string,
    location: room.location as string,
    timeZone: room.time_zone as string,
    status: room.status as DreamcatcherStatus,
    roundDurationMinutes: room.round_duration_minutes as number,
    queueCapacity: room.queue_capacity as number,
    cameraImagePath: (room.camera_image_path as string | null) ?? '/assets/concepts/dreamcatcher-live-feed.png',
    queue: (jobs ?? [])
      .filter((job: { dreamcatcher_id: string }) => job.dreamcatcher_id === room.id)
      .map((job: Record<string, unknown>) => {
        const world = job.worlds as { name?: string; description?: string; discoverer_name?: string } | null
        return {
          id: job.id as string,
          worldId: job.world_id as string,
          title: world?.name ?? 'Untitled world',
          description: world?.description ?? '',
          submitter: world?.discoverer_name ?? 'Unknown operative',
          status: job.status as DreamcatcherJobStatus,
          roundNumber: job.round_number as number,
        }
      }),
  }))
  return mappedRooms.toSorted((a, b) => ROOM_PRIORITY.indexOf(a.slug) - ROOM_PRIORITY.indexOf(b.slug))
}
