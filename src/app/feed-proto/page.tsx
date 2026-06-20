import { createAdminClient } from '@/lib/supabase/server'
import { worldStage, WORLD_STAGE_META, type WorldLifecycle } from '@/types/database'
import { FeedProtoClient, type FeedItem, type Person, type VoteCard } from './feed-client'

// Real data, always fresh.
export const dynamic = 'force-dynamic'

const ORANGE = '#FF6B35'
const AMBER = '#FFB020'
const GREEN = '#20D890'
const STAR = '#F5F5F5'

function initialOf(name?: string | null): string {
  const n = (name ?? '').trim()
  return n ? n[0].toUpperCase() : '◈'
}

function snippet(s?: string | null, n = 150): string | undefined {
  if (!s) return undefined
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

function rel(ts?: string | null): string {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
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
  if (d >= 1) return `ends ${d}d`
  return `ends ${Math.max(1, Math.floor(diff / 3600000))}h`
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

export default async function FeedProtoPage() {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const [intelR, worldR, deviceR, voyagerR, voteR] = await Promise.all([
    db.from('intel').select('id, title, content, images, classified, publisher_name, timestamp').order('timestamp', { ascending: false }).limit(6),
    db.from('worlds').select('id, name, description, image_path, lifecycle_state, gradient_from, gradient_to, discoverer_name, created_at').order('created_at', { ascending: false }).limit(8),
    db.from('devices').select('id, name, status, image_path, location, current_user_name, updated_at').order('updated_at', { ascending: false }).limit(4),
    db.from('activity_events').select('actor_id, actor_name, target_title, created_at').eq('event_type', 'voyager_activated').eq('is_visible', true).order('created_at', { ascending: false }).limit(3),
    db.from('votes').select('id, title, options, ends_at, created_at').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  // ── Avatar lookup for voyager actors + recent voters ──
  const vote = voteR.data
  let voters: Person[] = []
  let voteCount = 0
  if (vote) {
    const { data: vr } = await db.from('vote_responses')
      .select('voter_name, user_id, created_at')
      .eq('vote_id', vote.id).order('created_at', { ascending: false }).limit(12)
    const { count } = await db.from('vote_responses').select('*', { count: 'exact', head: true }).eq('vote_id', vote.id)
    voteCount = count ?? (vr?.length ?? 0)
    // de-dupe by user/name, keep most recent 5
    const seen = new Set<string>()
    const picked: { name: string; user_id: string | null }[] = []
    const rows = (vr ?? []) as { voter_name: string | null; user_id: string | null }[]
    for (let ri = 0; ri < rows.length; ri++) {
      const r = rows[ri]
      const key = r.user_id ?? r.voter_name ?? `anon-${ri}`
      if (seen.has(key)) continue
      seen.add(key)
      picked.push({ name: r.voter_name ?? 'Voyager', user_id: r.user_id })
      if (picked.length >= 5) break
    }
    voters = picked.map(p => ({ name: p.name, initial: initialOf(p.name) }))
    // hydrate avatars
    const ids = picked.map(p => p.user_id).filter(Boolean) as string[]
    if (ids.length) {
      const { data: profs } = await db.from('voyager_profiles').select('id, avatar_url').in('id', ids)
      const map = Object.fromEntries((profs ?? []).map((p: { id: string; avatar_url: string | null }) => [p.id, p.avatar_url]))
      voters = picked.map(p => ({ name: p.name, initial: initialOf(p.name), avatar: p.user_id ? map[p.user_id] ?? null : null }))
    }
  }

  const voyagerActors = (voyagerR.data ?? []) as { actor_id: string | null; actor_name: string; target_title: string | null; created_at: string }[]
  const actorIds = voyagerActors.map(v => v.actor_id).filter(Boolean) as string[]
  let actorAvatars: Record<string, string | null> = {}
  if (actorIds.length) {
    const { data: profs } = await db.from('voyager_profiles').select('id, avatar_url').in('id', actorIds)
    actorAvatars = Object.fromEntries((profs ?? []).map((p: { id: string; avatar_url: string | null }) => [p.id, p.avatar_url]))
  }

  // ── Normalize into FeedItem[] ──
  const intelItems: FeedItem[] = ((intelR.data ?? []) as Record<string, unknown>[]).map(r => {
    const images = (r.images as string[] | null) ?? []
    return {
      id: `intel-${r.id}`, kind: 'info', color: ORANGE, eyebrow: 'INTELLIGENCE',
      title: String(r.title ?? 'Untitled report'),
      snippet: snippet(r.content as string),
      image: images[0] ?? null,
      actor: r.publisher_name ? { name: String(r.publisher_name), initial: initialOf(String(r.publisher_name)) } : null,
      time: rel(r.timestamp as string),
    }
  })

  const worldItems: FeedItem[] = ((worldR.data ?? []) as Record<string, unknown>[]).map(r => {
    const stage = worldStage((r.lifecycle_state as WorldLifecycle) ?? 'proposed')
    const label = WORLD_STAGE_META[stage].label
    const name = String(r.name ?? 'Unnamed world')
    const title = stage === 'raw' ? `A New Initial Vision: ${name}`
      : stage === 'tuning' ? `Signal tuning begins: ${name}`
      : `Established World: ${name}`
    return {
      id: `world-${r.id}`, kind: 'world', color: AMBER, eyebrow: label.toUpperCase(),
      title,
      snippet: snippet(r.description as string),
      image: (r.image_path as string) || null,
      gradient: r.gradient_from && r.gradient_to ? [String(r.gradient_from), String(r.gradient_to)] : null,
      actor: r.discoverer_name ? { name: String(r.discoverer_name), initial: initialOf(String(r.discoverer_name)) } : null,
      time: rel(r.created_at as string),
    }
  })

  const deviceItems: FeedItem[] = ((deviceR.data ?? []) as Record<string, unknown>[]).map(r => ({
    id: `device-${r.id}`, kind: 'device', color: GREEN, eyebrow: 'DEVICE',
    title: String(r.name ?? 'Device'),
    snippet: snippet([r.status, r.location].filter(Boolean).join(' · ') || undefined, 80),
    image: (r.image_path as string) || null,
    actor: r.location ? { name: String(r.location), initial: initialOf(String(r.location)) } : null,
    time: rel(r.updated_at as string),
  }))

  const memberItems: FeedItem[] = voyagerActors.map((v, i) => ({
    id: `voyager-${i}-${v.actor_id ?? v.actor_name}`, kind: 'member', color: STAR, eyebrow: 'NEW VOYAGER',
    title: v.target_title || 'Become a new Voyager: World Builder',
    memberSub: undefined,
    actor: { name: v.actor_name, initial: initialOf(v.actor_name), avatar: v.actor_id ? actorAvatars[v.actor_id] ?? null : null },
    time: rel(v.created_at),
  }))

  // Interleave for variety: round-robin across type buckets.
  const buckets = [worldItems, intelItems, deviceItems, memberItems]
  const items: FeedItem[] = []
  for (let i = 0; i < 10; i++) {
    for (const b of buckets) if (b[i]) items.push(b[i])
  }

  const voteCard: VoteCard | null = vote ? {
    id: String(vote.id),
    title: String(vote.title ?? 'Open signal vote'),
    options: coerceOptions(vote.options),
    voters,
    count: voteCount,
    ends: until(vote.ends_at as string),
    time: rel(vote.created_at),
  } : null

  return <FeedProtoClient items={items} vote={voteCard} />
}
