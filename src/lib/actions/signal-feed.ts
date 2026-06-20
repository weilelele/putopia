'use server'

import { unstable_cache } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getTuningCovers } from '@/lib/actions/signal-tasks'
import { worldStage, type WorldLifecycle } from '@/types/database'
import type { FeedEntry, FeedItem, Person, PosterWorld, VoteCard } from '@/app/feed-proto/feed-client'

const ORANGE = '#FF6B35'
const AMBER = '#FFB020'
const GREEN = '#20D890'
const STAR = '#F5F5F5'

function initialOf(name?: string | null): string {
  const n = (name ?? '').trim()
  return n ? n[0].toUpperCase() : '◈'
}

function snippet(s?: string | null, n = 140): string | undefined {
  if (!s) return undefined
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

function rel(ts?: string | null): string {
  if (!ts) return ''
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function until(ts?: string | null): string {
  if (!ts) return 'open'
  const diff = new Date(ts).getTime() - Date.now()
  if (diff <= 0) return 'closed'
  const d = Math.floor(diff / 86400000)
  return d >= 1 ? `ends ${d}d` : `ends ${Math.max(1, Math.floor(diff / 3600000))}h`
}

// Converts legacy single-string scope (pre-schema_v8) to a role array. Mirrors
// normalizeScope in actions/votes.ts — kept local because a 'use server' module
// can only export async functions.
function normalizeScope(scope: unknown): string[] {
  if (Array.isArray(scope)) return scope as string[]
  switch (scope) {
    case 'public':
    case 'applicant': return ['applicant', 'voyager', 'architect']
    case 'voyager':   return ['voyager', 'architect']
    case 'architect': return ['architect']
    default:          return ['applicant', 'voyager', 'architect']
  }
}

function coerceOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map(o => {
    if (typeof o === 'string') return o
    if (o && typeof o === 'object') {
      const r = o as Record<string, unknown>
      return String(r.label ?? r.text ?? r.option ?? r.value ?? r.title ?? '')
    }
    return String(o)
  }).filter(Boolean)
}

// `canSeeGated` = the viewer is a voyager/architect. Gated items (classified
// intel, voyager-only votes) stay in the single feed pool for everyone, but for
// ineligible viewers their bodies are STRIPPED here on the server (not merely
// hidden in CSS) — only the title survives, plus a `locked` flag the client
// renders as a "VOYAGER ONLY" cover. The cache is bucketed by this boolean so an
// ineligible viewer's payload never carries the protected content.
async function buildSignalFeed(canSeeGated: boolean): Promise<FeedEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const tuningCoversP = getTuningCovers()

  const worldCols = 'id, name, name_en, description, image_path, lifecycle_state, gradient_from, gradient_to, discoverer_name, discoverer_id, submitted_at, created_at'
  const [intelR, wProposedR, wSyncingR, wStableR, deviceR, voyagerR, voteR] = await Promise.all([
    // All intel enters the pool; classified rows are teased (title only) to
    // ineligible viewers and gated below — the body is never sent to them.
    db.from('intel').select('id, title, content, images, classified, publisher_name, publisher_id, timestamp').order('timestamp', { ascending: false }).limit(6),
    db.from('worlds').select(worldCols).eq('lifecycle_state', 'proposed').order('submitted_at', { ascending: false }).limit(8),
    db.from('worlds').select(worldCols).eq('lifecycle_state', 'syncing').order('created_at', { ascending: false }).limit(5),
    db.from('worlds').select(worldCols).eq('lifecycle_state', 'stable').order('created_at', { ascending: false }).limit(2),
    db.from('devices').select('id, name, description, knowledge, image_path, status, location, current_user_name, current_user_id, updated_at').order('updated_at', { ascending: false }).limit(4),
    db.from('activity_events').select('actor_id, actor_name, target_title, created_at').eq('event_type', 'voyager_activated').eq('is_visible', true).order('created_at', { ascending: false }).limit(8),
    db.from('votes').select('id, title, options, scope, ends_at, created_at').eq('is_active', true).order('created_at', { ascending: false }).limit(5),
  ])

  const intelRows = (intelR.data ?? []) as Record<string, unknown>[]
  const worldRows = [...(wProposedR.data ?? []), ...(wSyncingR.data ?? []), ...(wStableR.data ?? [])] as Record<string, unknown>[]
  const deviceRows = (deviceR.data ?? []) as Record<string, unknown>[]
  const voyagerRows = (voyagerR.data ?? []) as { actor_id: string | null; actor_name: string; target_title: string | null; created_at: string }[]
  const voteRows = (voteR.data ?? []) as Record<string, unknown>[]

  // Signal Tuning timestamps: a world enters tuning when its signal_thread is created.
  const syncingIds = worldRows.filter(w => w.lifecycle_state === 'syncing').map(w => String(w.id))
  const tuningAt: Record<string, string> = {}
  if (syncingIds.length) {
    const { data: threads } = await db.from('signal_threads').select('world_id, created_at').in('world_id', syncingIds).order('created_at', { ascending: false })
    for (const t of (threads ?? []) as { world_id: string | null; created_at: string }[]) {
      if (t.world_id && !tuningAt[t.world_id]) tuningAt[t.world_id] = t.created_at
    }
  }

  const ids = new Set<string>()
  intelRows.forEach(r => r.publisher_id && ids.add(String(r.publisher_id)))
  worldRows.forEach(r => r.discoverer_id && ids.add(String(r.discoverer_id)))
  deviceRows.forEach(r => r.current_user_id && ids.add(String(r.current_user_id)))
  voyagerRows.forEach(r => r.actor_id && ids.add(r.actor_id))

  // All active votes: batch-fetch responses for all vote IDs in one query.
  type RawResponse = { vote_id: string; voter_name: string | null; user_id: string | null; selected_options: unknown; created_at: string }
  const voteIds = voteRows.map(v => String(v.id))
  let allResponses: RawResponse[] = []
  const countByVote: Record<string, number> = {}
  if (voteIds.length) {
    const { data: respData } = await db
      .from('vote_responses')
      .select('vote_id, voter_name, user_id, selected_options, created_at')
      .in('vote_id', voteIds)
      .order('created_at', { ascending: false })
    allResponses = (respData ?? []) as RawResponse[]
    // count per vote from the fetched rows (accurate enough; full count not needed for display)
    for (const r of allResponses) countByVote[r.vote_id] = (countByVote[r.vote_id] ?? 0) + 1
    // collect voter user_ids for avatar lookup
    allResponses.forEach(r => { if (r.user_id) ids.add(r.user_id) })
  }

  const avatarMap: Record<string, string | null> = {}
  if (ids.size) {
    const { data: profs } = await db.from('voyager_profiles').select('id, avatar_url').in('id', [...ids])
    for (const p of (profs ?? []) as { id: string; avatar_url: string | null }[]) avatarMap[p.id] = p.avatar_url
  }

  // Build one VoteCard per active vote using the pre-fetched responses.
  function buildVoteCard(vote: Record<string, unknown>): VoteCard {
    const vid = String(vote.id)
    // A vote is gated when applicants cannot participate (scope excludes
    // 'applicant') — same definition the /vote page uses for "classified".
    const gated = !normalizeScope(vote.scope).includes('applicant')
    const locked = gated && !canSeeGated
    if (locked) {
      // Tease the title only — strip options, voters and tallies entirely.
      return {
        id: vid, title: String(vote.title ?? 'Open signal vote'), options: [],
        voters: [], count: 0,
        ends: until(vote.ends_at as string), time: rel(vote.created_at as string),
        locked: true,
      }
    }
    const options = coerceOptions(vote.options)
    const labelById: Record<string, string> = {}
    if (Array.isArray(vote.options)) {
      for (const o of vote.options as unknown[]) {
        if (o && typeof o === 'object') {
          const r = o as Record<string, unknown>
          if (r.id) labelById[String(r.id)] = String(r.label ?? r.text ?? r.id)
        }
      }
    }
    const rows = allResponses.filter(r => r.vote_id === vid)
    const seen = new Set<string>()
    const picked: { name: string; user_id: string | null; option?: string }[] = []
    for (let i = 0; i < rows.length && picked.length < 5; i++) {
      const r = rows[i]
      const key = r.user_id ?? r.voter_name ?? `anon-${i}`
      if (seen.has(key)) continue
      seen.add(key)
      const sel = Array.isArray(r.selected_options) ? r.selected_options[0] : r.selected_options
      const option = typeof sel === 'number' ? options[sel] : typeof sel === 'string' ? (labelById[sel] ?? sel) : undefined
      picked.push({ name: r.voter_name ?? 'Voyager', user_id: r.user_id, option })
    }
    const voters: Person[] = picked.map(p => ({
      name: p.name, initial: initialOf(p.name), option: p.option,
      avatar: p.user_id ? avatarMap[p.user_id] ?? null : null,
    }))
    return {
      id: vid, title: String(vote.title ?? 'Open signal vote'), options,
      voters, count: countByVote[vid] ?? 0,
      ends: until(vote.ends_at as string), time: rel(vote.created_at as string),
    }
  }

  const voteCards = voteRows.map(buildVoteCard)

  const person = (name?: string | null, id?: string | null): Person | null =>
    name ? { name: String(name), initial: initialOf(String(name)), avatar: id ? avatarMap[String(id)] ?? null : null, id: id ? String(id) : null } : null

  const HL = { vision: 24, tuning: 72, established: 168, intel: 168, device: 48, member: 24 }
  type Built = { ts: number; bucket: string; item: FeedItem }

  const intelItems: Built[] = intelRows.map(r => {
    const images = (r.images as string[] | null) ?? []
    // Classified intel is gated. For ineligible viewers strip the body, cover
    // image and publisher byline — only the title and a `locked` flag ship.
    const locked = r.classified === true && !canSeeGated
    return {
      ts: new Date(String(r.timestamp ?? 0)).getTime(), bucket: 'intel',
      item: {
        id: `intel-${r.id}`, kind: 'info', color: ORANGE, eyebrow: 'INTELLIGENCE',
        title: String(r.title ?? 'Untitled report'),
        snippet: locked ? undefined : snippet(r.content as string, 140),
        image: locked ? null : (images[0] ?? null),
        actor: locked ? null : person(r.publisher_name as string, r.publisher_id as string),
        href: `/intel/${r.id}`, time: rel(r.timestamp as string),
        locked,
      },
    }
  })

  const tuningCovers = await tuningCoversP

  const worldItems: Built[] = worldRows.map(r => {
    const id = String(r.id)
    const stage = worldStage((r.lifecycle_state as WorldLifecycle) ?? 'proposed')
    const name = String(r.name ?? 'Unnamed world')
    const eyebrow = stage === 'raw' ? 'A NEW INITIAL VISION' : stage === 'tuning' ? 'SIGNAL TUNING BEGINS' : 'ESTABLISHED WORLD'
    const tsStr = stage === 'tuning' ? (tuningAt[id] ?? (r.submitted_at as string)) : (r.submitted_at as string) ?? (r.created_at as string)
    const ts = new Date(tsStr ?? 0).getTime()
    const href = `/worlds/${encodeURIComponent(id)}`
    const actor = person(r.discoverer_name as string, r.discoverer_id as string)
    const image = (r.image_path as string) || (stage === 'tuning' ? tuningCovers[id] : undefined) || null
    const bucket = stage === 'raw' ? 'vision' : stage === 'tuning' ? 'tuning' : 'established'

    const displayName = (r.name_en as string) || name
    if (image) {
      return {
        ts, bucket,
        item: { id: `world-${id}`, kind: 'info', color: AMBER, eyebrow, label: eyebrow, title: displayName, snippet: snippet(r.description as string, 140), image, actor, href, time: rel(tsStr) },
      }
    }
    const world: PosterWorld = {
      id, name, name_en: r.name_en as string, description: r.description as string,
      gradient_from: r.gradient_from as string, gradient_to: r.gradient_to as string,
      image_path: r.image_path as string, discoverer_name: r.discoverer_name as string,
      discoverer_avatar_url: r.discoverer_id ? avatarMap[String(r.discoverer_id)] ?? null : null,
    }
    return { ts, bucket, item: { id: `world-${id}`, kind: 'world', color: AMBER, eyebrow, title: name, href, time: rel(tsStr), established: stage === 'established', world } }
  })

  const deviceItems: Built[] = deviceRows.map(r => ({
    ts: new Date(String(r.updated_at ?? 0)).getTime(), bucket: 'device',
    item: {
      id: `device-${r.id}`, kind: 'device', color: GREEN, eyebrow: 'DEVICE',
      title: String(r.name ?? 'Device'),
      snippet: snippet((r.description as string) || (r.knowledge as string) || (r.status as string), 140),
      image: (r.image_path as string) || null,
      actor: person(r.current_user_name as string, r.current_user_id as string),
      href: `/devices/${r.id}`, time: rel(r.updated_at as string),
    },
  }))

  const memberItems: Built[] = voyagerRows.map((v, i) => ({
    ts: new Date(v.created_at ?? 0).getTime(), bucket: 'member',
    item: {
      id: `voyager-${i}-${v.actor_id ?? v.actor_name}`, kind: 'member', color: STAR, eyebrow: 'NEW VOYAGER',
      title: v.target_title || 'Become a new Voyager: World Builder',
      actor: person(v.actor_name, v.actor_id), href: '/voyagers', time: rel(v.created_at),
    },
  }))

  // Seven buckets, each newest-first.
  void HL
  const grouped: Record<string, FeedEntry[]> = { vision: [], tuning: [], established: [], intel: [], device: [], member: [] }
  for (const b of [...worldItems, ...intelItems, ...deviceItems, ...memberItems].sort((a, b2) => b2.ts - a.ts)) {
    grouped[b.bucket]?.push({ kind: 'content', item: b.item })
  }

  grouped.vote = voteCards.map(vc => ({ kind: 'vote' as const, vote: vc }))

  // Round-robin across buckets — most take 1 per round; Intelligence and New
  // Voyager take 2 (higher-volume, lighter cards). Vote stays in its bucket for
  // its whole active window.
  const PLAN: { key: string; n: number }[] = [
    { key: 'vote', n: 1 },
    { key: 'intel', n: 2 },
    { key: 'vision', n: 1 },
    { key: 'tuning', n: 1 },
    { key: 'device', n: 1 },
    { key: 'member', n: 2 },
    { key: 'established', n: 1 },
  ]
  const ptr: Record<string, number> = {}
  const entries: FeedEntry[] = []
  let added = true
  while (added) {
    added = false
    for (const { key, n } of PLAN) {
      const arr = grouped[key] ?? []
      let p = ptr[key] ?? 0
      for (let k = 0; k < n && p < arr.length; k++) { entries.push(arr[p]); p++; added = true }
      ptr[key] = p
    }
  }
  return entries
}

// Cached 30s — /console is the highest-traffic page; this collapses concurrent
// loads onto one set of queries while keeping the feed feeling live. The
// `canSeeGated` argument is part of the cache key, so there are two buckets:
// one for voyager/architect (full content) and one for everyone else (gated
// bodies stripped). Key bumped to -v3 for the gating payload shape.
const getSignalFeedCached = unstable_cache(buildSignalFeed, ['signal-feed-v3'], { revalidate: 30 })

// Derived per request (uncached) from the session — never trust a client-passed
// role. Only voyager/architect may receive gated content.
async function viewerCanSeeGated(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data: profile } = await supabase
      .from('voyager_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    return profile?.role === 'voyager' || profile?.role === 'architect'
  } catch {
    return false
  }
}

export async function getSignalFeed(): Promise<FeedEntry[]> {
  const canSeeGated = await viewerCanSeeGated()
  return getSignalFeedCached(canSeeGated)
}
