'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityEventType =
  | 'intel_published'
  | 'intel_updated'
  | 'device_updated'
  | 'world_added'
  | 'vote_opened'
  | 'vote_cast'
  | 'member_joined'
  | 'voyager_activated'   // became a Voyager via the first parts pack ($12)
  | 'device_matched'      // completed the trait test + paid → matched a device

export interface ActivityEventInsert {
  actor_id:     string | null
  actor_name:   string
  actor_role:   string
  actor_socials?: { platform: string; url: string }[]
  event_type:   ActivityEventType
  target_id?:   string
  target_title?: string
  target_image?: string
  target_href?:  string
  vote_option?:  string
  group_key?:    string
}

export type ActivityEvent = ActivityEventInsert & {
  id:              string
  created_at:      string
  is_visible:      boolean
  actor_avatar_url?: string | null
}

// ─── Write (called from other action files) ───────────────────────────────────

// Fire-and-forget helper — errors are swallowed so they never break the main action.
export async function logActivity(event: ActivityEventInsert): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('activity_events').insert({
      ...event,
      actor_socials: event.actor_socials ?? [],
    })
  } catch {
    // intentionally silent — feed log should never block primary operations
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getActivityFeed(days = 7): Promise<ActivityEvent[]> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await admin.from('activity_events')
    .select('*')
    .eq('is_visible', true)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) console.error('[getActivityFeed]', error.message)
  const events = (data ?? []) as ActivityEvent[]

  // Batch-fetch latest avatar_url for all actors
  const actorIds = [...new Set(events.map(e => e.actor_id).filter(Boolean))] as string[]
  if (actorIds.length > 0) {
    const { data: profiles } = await admin.from('voyager_profiles')
      .select('id, avatar_url')
      .in('id', actorIds)
    const avatarMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.avatar_url]))
    return events.map(e => ({ ...e, actor_avatar_url: e.actor_id ? (avatarMap[e.actor_id] ?? null) : null }))
  }
  return events
}

// ─── Admin: list all (including hidden) ──────────────────────────────────────

export async function getActivityFeedAdmin(): Promise<ActivityEvent[]> {
  const admin = createAdminClient()
  const { data, error } = await admin.from('activity_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) console.error('[getActivityFeedAdmin]', error.message)
  return (data ?? []) as ActivityEvent[]
}

// ─── Admin: toggle visibility ─────────────────────────────────────────────────

export async function setActivityEventVisibility(id: string, visible: boolean) {
  const admin = createAdminClient()
  const { error } = await admin.from('activity_events')
    .update({ is_visible: visible })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/activity')
  revalidatePath('/console')
  return { error: null }
}

// ─── Admin: hard delete ───────────────────────────────────────────────────────

export async function deleteActivityEvent(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('activity_events')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/activity')
  revalidatePath('/console')
  return { error: null }
}
