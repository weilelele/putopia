'use server'

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
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

async function buildSignalFeed(): Promise<FeedEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const tuningCoversP = getTuningCovers()

  const worldCols = 'id, name, name_en, description, image_path, lifecycle_state, gradient_from, gradient_to, discoverer_name, discoverer_id, submitted_at, created_at'
  const [intelR, wProposedR, wSyncingR, wStableR, deviceR, voyagerR, voteR] = await Promise.all([
    // Classified intel (e.g. "Rumor:" reports) is gated — keep it out of the
    // public-facing feed; it stays reachable on the permissioned /intel pages.
    db.from('intel').select('id, title, content, images, classified, publisher_name, publisher_id, timestamp').eq('classified', false).order('timestamp', { ascending: false }).limit(6),
    db.from('worlds').select(worldCols).eq('lifecycle_state', 'proposed').order('submitted_at', { ascending: false }).limit(6),
    db.from('worlds').select(worldCols).eq('lifecycle_state', 'syncing').order('created_at', { ascending: false }).limit(5),
    db.from('worlds').select(worldCols).eq('lifecycle_state', 'stable').order('created_at', { ascending: false }).limit(2),
    db.from('devices').select('id, name, description, knowledge, image_path, status, location, current_user_name, current_user_id, updated_at').order('updated_at', { ascending: false }).limit(4),
    db.from('activity_events').select('actor_id, actor_name, target_title, created_at').eq('event_type', 'voyager_activated').eq('is_visible', true).order('created_at', { ascending: false }).limit(3),
    db.from('votes').select('id, title, options, ends_at, created_at').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const intelRows = (intelR.data ?? []) as Record<string, unknown>[]
  const worldRows = [...(wProposedR.data ?? []), ...(wSyncingR.data ?? []), ...(wStableR.data ?? [])] as Record<string, unknown>[]
  const deviceRows = (deviceR.data ?? []) as Record<string, unknown>[]
  const voyagerRows = (voyagerR.data ?? []) as { actor_id: string | null; actor_name: string; target_title: string | null; created_at: string }[]
  const vote = voteR.data as Record<string, unknown> | null

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

  // Active vote + most-recent voters (with their chosen option).
  let voters: Person[] = []
  let voteCount = 0
  let voteOptions: string[] = []
  if (vote) {
    voteOptions = coerceOptions(vote.options)
    const labelById: Record<string, string> = {}
    if (Array.isArray(vote.options)) {
      for (const o of vote.options as unknown[]) {
        if (o && typeof o === 'object') {
          const r = o as Record<string, unknown>
          if (r.id) labelById[String(r.id)] = String(r.label ?? r.text ?? r.id)
        }
      }
    }
    const { data: vr } = await db.from('vote_responses').select('voter_name, user_id, selected_options, created_at').eq('vote_id', vote.id).order('created_at', { ascending: false }).limit(15)
    const { count } = await db.from('vote_responses').select('*', { count: 'exact', head: true }).eq('vote_id', vote.id)
    voteCount = count ?? 0
    const seen = new Set<string>()
    const picked: { name: string; user_id: string | null; option?: string }[] = []
    const rows = (vr ?? []) as { voter_name: string | null; user_id: string | null; selected_options: unknown }[]
    for (let i = 0; i < rows.length && picked.length < 5; i++) {
      const r = rows[i]
      const key = r.user_id ?? r.voter_name ?? `anon-${i}`
      if (seen.has(key)) continue
      seen.add(key)
      const sel = Array.isArray(r.selected_options) ? r.selected_options[0] : r.selected_options
      const option = typeof sel === 'number' ? voteOptions[sel] : typeof sel === 'string' ? (labelById[sel] ?? sel) : undefined
      picked.push({ name: r.voter_name ?? 'Voyager', user_id: r.user_id, option })
      if (r.user_id) ids.add(r.user_id)
    }
    voters = picked.map(p => ({ name: p.name, initial: initialOf(p.name), option: p.option }))
    ;(voters as (Person & { _uid?: string | null })[]).forEach((v, i) => { v._uid = picked[i].user_id })
  }

  const avatarMap: Record<string, string | null> = {}
  if (ids.size) {
    const { data: profs } = await db.from('voyager_profiles').select('id, avatar_url').in('id', [...ids])
    for (const p of (profs ?? []) as { id: string; avatar_url: string | null }[]) avatarMap[p.id] = p.avatar_url
  }
  voters = (voters as (Person & { _uid?: string | null })[]).map(v => ({ name: v.name, initial: v.initial, option: v.option, avatar: v._uid ? avatarMap[v._uid] ?? null : null }))

  const person = (name?: string | null, id?: string | null): Person | null =>
    name ? { name: String(name), initial: initialOf(String(name)), avatar: id ? avatarMap[String(id)] ?? null : null } : null

  const HL = { vision: 24, tuning: 72, established: 168, intel: 168, device: 48, member: 24 }
  type Built = { ts: number; bucket: string; item: FeedItem }

  const intelItems: Built[] = intelRows.map(r => {
    const images = (r.images as string[] | null) ?? []
    return {
      ts: new Date(String(r.timestamp ?? 0)).getTime(), bucket: 'intel',
      item: {
        id: `intel-${r.id}`, kind: 'info', color: ORANGE, eyebrow: 'INTELLIGENCE',
        title: String(r.title ?? 'Untitled report'),
        snippet: snippet(r.content as string, 140),
        image: images[0] ?? null,
        actor: person(r.publisher_name as string, r.publisher_id as string),
        href: `/intel/${r.id}`, time: rel(r.timestamp as string),
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

  const voteCard: VoteCard | null = vote ? {
    id: String(vote.id), title: String(vote.title ?? 'Open signal vote'), options: voteOptions,
    voters, count: voteCount, ends: until(vote.ends_at as string), time: rel(vote.created_at as string),
  } : null
  grouped.vote = voteCard ? [{ kind: 'vote', vote: voteCard }] : []

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
// loads onto one set of queries while keeping the feed feeling live.
const getSignalFeedCached = unstable_cache(buildSignalFeed, ['signal-feed'], { revalidate: 30 })

export async function getSignalFeed(): Promise<FeedEntry[]> {
  return getSignalFeedCached()
}
