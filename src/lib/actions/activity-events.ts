'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
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
    const { error } = await admin.from('activity_events').insert({
      ...event,
      actor_socials: event.actor_socials ?? [],
    })
    // Never throw, but DO surface the failure — a silently-broken feed log
    // (e.g. schema drift) was previously undetectable.
    if (error) console.error('[logActivity] insert failed:', event.event_type, error.message)
  } catch (e) {
    console.error('[logActivity] threw:', event.event_type, (e as Error).message)
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

// Per-type feed windows (hours). High-frequency / low-signal event types get a
// short TTL so they auto-expire and don't crowd the feed. Tunable independently.
const VOTE_WINDOW_HOURS  = 12   // vote_cast (only used when SHOW_VOTE_EVENTS)
const WORLD_WINDOW_HOURS = 12   // world_added ("world log") — separate knob, same as votes by default

// TEMP: all vote events (vote_opened + vote_cast) are currently pulled from the
// feed. Flip to `true` to restore them (re-enables the vote_cast queue and stops
// excluding vote_opened from queue 1).
const SHOW_VOTE_EVENTS = false

// Three-queue feed: long-lived events (7d) + vote_cast (12h) + world_added (12h),
// each capped at 20 items so no single high-frequency type crowds out the rest.
//
// Cached for 30 s: this fired 4 DB queries per console load (highest-volume page,
// including ad traffic). The 30 s window keeps the feed feeling live while
// collapsing concurrent loads onto a single set of queries. unstable_cache keys
// by the `days` argument automatically. Exported as a thin async wrapper because
// 'use server' files require every export to be a literal async function.
const getActivityFeedCached = unstable_cache(
  _getActivityFeed,
  ['activity-feed'],
  { revalidate: 30 },
)

export async function getActivityFeed(days = 7): Promise<ActivityEvent[]> {
  return getActivityFeedCached(days)
}

async function _getActivityFeed(days = 7): Promise<ActivityEvent[]> {
  const admin = createAdminClient()
  const since7d    = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const sinceWorld = new Date(Date.now() - WORLD_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  // Queue 1 — long-lived events: everything except the per-type queues (vote_cast,
  // world_added); also excludes vote_opened while votes are hidden. (7 days, 20 items)
  let q1 = admin.from('activity_events')
    .select('*')
    .eq('is_visible', true)
    .neq('event_type', 'vote_cast')
    .neq('event_type', 'world_added')
  if (!SHOW_VOTE_EVENTS) q1 = q1.neq('event_type', 'vote_opened')
  const { data: nonVote, error: e1 } = await q1
    .gte('created_at', since7d)
    .order('created_at', { ascending: false })
    .limit(20)

  // Queue 2 — vote_cast only (short window, 20 items). Disabled while votes are hidden.
  let voteCast: ActivityEvent[] = []
  if (SHOW_VOTE_EVENTS) {
    const sinceVote = new Date(Date.now() - VOTE_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
    const { data, error: e2 } = await admin.from('activity_events')
      .select('*')
      .eq('is_visible', true)
      .eq('event_type', 'vote_cast')
      .gte('created_at', sinceVote)
      .order('created_at', { ascending: false })
      .limit(20)
    if (e2) console.error('[getActivityFeed] vote_cast query', e2.message)
    voteCast = (data ?? []) as ActivityEvent[]
  }

  // Queue 3 — world_added ("world log") only (short window, 20 items)
  const { data: worldAdded, error: e3 } = await admin.from('activity_events')
    .select('*')
    .eq('is_visible', true)
    .eq('event_type', 'world_added')
    .gte('created_at', sinceWorld)
    .order('created_at', { ascending: false })
    .limit(20)

  if (e1) console.error('[getActivityFeed] non-vote query', e1.message)
  if (e3) console.error('[getActivityFeed] world_added query', e3.message)

  const events = [...(nonVote ?? []), ...voteCast, ...(worldAdded ?? [])] as ActivityEvent[]

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
