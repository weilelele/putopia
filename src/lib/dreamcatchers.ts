import { createAdminClient } from '@/lib/supabase/server'
import { publicDreamcatchers } from '@/lib/dreamcatcher-publication'

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
  observedAt: number
}

const ROOM_PRIORITY = ['kyoto-02', 'tokyo-01', 'london-01', 'mexico-city-03']

export async function listDreamcatcherRooms(): Promise<DreamcatcherRoom[]> {
  const observedAt = Date.now()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from('dreamcatchers') as any)
    .select('id, slug, code, name, city, location, time_zone, status, round_duration_minutes, queue_capacity, camera_image_path, is_public')
    .eq('is_public', true)
    .order('created_at', { ascending: true })
  if (error) throw new Error('The Dreamcatcher registry is temporarily unavailable.')
  const rooms = publicDreamcatchers((data ?? []) as Array<Record<string, unknown> & { id: string; is_public: boolean }>)
  if (!rooms.length) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: jobs, error: jobsError } = await (admin.from('dreamcatcher_jobs') as any)
    .select('id, dreamcatcher_id, world_id, submitted_by, status, round_number, queued_at, worlds(name, description, discoverer_name)')
    .in('dreamcatcher_id', rooms.map((room: { id: string }) => room.id))
    .in('status', ['queued', 'processing', 'awaiting_dispatch', 'awaiting_vote', 'returning'])
    .order('queued_at', { ascending: true })
  if (jobsError) throw new Error('The Dreamcatcher queue is temporarily unavailable.')

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
    observedAt,
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
