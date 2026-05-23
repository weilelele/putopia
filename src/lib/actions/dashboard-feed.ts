'use server'

import { createAdminClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export type FeedEntity = {
  type: 'device' | 'voyager'
  name: string
  image_url: string | null
  id: string
}

export type FeedLine = {
  ts: string        // "MM.DD"
  text: string      // summary (≤ 80 chars)
  entities: FeedEntity[]
}

export type DashboardFeed = {
  id: string
  generated_at: string
  lines: FeedLine[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTs(iso: string) {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function trunc(s: string, max: number) {
  return s.length <= max ? s : s.slice(0, max - 1) + '…'
}

const STATUS_LABEL: Record<string, string> = {
  available:    'now AVAILABLE',
  in_use:       'confirmed IN USE',
  needs_repair: 'flagged for REPAIR',
  unknown:      'status UNKNOWN',
}

// ── Read latest feed ──────────────────────────────────────────────────────────

export async function getLatestFeed(): Promise<DashboardFeed | null> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin.from('dashboard_feed' as any) as any)
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  return (data as unknown as DashboardFeed) ?? null
}

// ── Generate + save new feed ──────────────────────────────────────────────────

const MAX_LINES = 8
const DAYS_BACK = 60

export async function generateAndSaveFeed(): Promise<{ error: string | null; feed: DashboardFeed | null }> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString()

  // 1. Pull data from all modules
  const [{ data: intelRows }, { data: devices }, { data: voyagers }] = await Promise.all([
    admin.from('intel')
      .select('id, title, content, timestamp, tag, classified')
      .eq('classified', false)
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(12),
    admin.from('devices')
      .select('id, name, status, location, current_user_name, knowledge, image_path, updated_at')
      .eq('knowledge', 'known')
      .order('updated_at', { ascending: false })
      .limit(8),
    admin.from('voyager_profiles')
      .select('id, display_name, avatar_url, role, joined_at')
      .in('role', ['voyager', 'architect'])   // applicants and guests never appear
      .gte('joined_at', since)
      .order('joined_at', { ascending: false })
      .limit(6),
  ])

  // 2. Build feed lines from templates
  const candidates: (FeedLine & { _sort: string })[] = []

  // Intel entries → one line each (title as headline)
  for (const r of intelRows ?? []) {
    const text = trunc(r.title, 80)
    candidates.push({
      ts: fmtTs(r.timestamp),
      text,
      entities: [],
      _sort: r.timestamp,
    })
  }

  // Known devices → one line per device with status
  for (const d of devices ?? []) {
    const statusStr = STATUS_LABEL[d.status ?? 'unknown'] ?? `status ${d.status}`
    const loc = d.location ? ` — ${d.location}` : ''
    const user = d.current_user_name && d.status === 'in_use' ? `, operated by ${d.current_user_name}` : ''
    const text = trunc(`${d.name} ${statusStr}${loc}${user}`, 80)
    candidates.push({
      ts: fmtTs(d.updated_at),
      text,
      entities: [{
        type: 'device',
        name: d.name,
        image_url: d.image_path ?? null,
        id: d.id,
      }],
      _sort: d.updated_at,
    })
  }

  // New Voyagers and Architects
  for (const v of voyagers ?? []) {
    const roleLabel = v.role === 'architect' ? 'Architect' : 'Voyager'
    const text = trunc(`${roleLabel} ${v.display_name} joined the Collective`, 80)
    candidates.push({
      ts: fmtTs(v.joined_at),
      text,
      entities: [{
        type: 'voyager',
        name: v.display_name,
        image_url: v.avatar_url ?? null,
        id: v.id,
      }],
      _sort: v.joined_at,
    })
  }

  if (!candidates.length) {
    return { error: 'No data available to generate feed', feed: null }
  }

  // 3. Sort by date desc, deduplicate by type to ensure variety, cap at MAX_LINES
  candidates.sort((a, b) => b._sort.localeCompare(a._sort))

  // Interleave types: pick up to 3 intel, up to 2 device, up to 1 voyager
  const picked: typeof candidates = []
  let intel = 0, device = 0, voyager = 0
  const LIMITS = { intel: 4, device: 3, voyager: 2 }

  // First pass: fill within type limits
  for (const c of candidates) {
    if (picked.length >= MAX_LINES) break
    const hasDevice = c.entities.some(e => e.type === 'device')
    const hasVoyager = c.entities.some(e => e.type === 'voyager')
    const type = hasDevice ? 'device' : hasVoyager ? 'voyager' : 'intel'
    if (type === 'device' && device < LIMITS.device) { picked.push(c); device++ }
    else if (type === 'voyager' && voyager < LIMITS.voyager) { picked.push(c); voyager++ }
    else if (type === 'intel' && intel < LIMITS.intel) { picked.push(c); intel++ }
  }

  // Second pass: fill remaining slots if still under MAX_LINES
  for (const c of candidates) {
    if (picked.length >= MAX_LINES) break
    if (!picked.includes(c)) picked.push(c)
  }

  // Re-sort picked lines by date desc
  picked.sort((a, b) => b._sort.localeCompare(a._sort))

  const lines: FeedLine[] = picked.map(({ _sort: _, ...rest }) => rest)

  // 4. Save to DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feedTable = admin.from('dashboard_feed' as any)
  const { data: saved, error: dbErr } = await feedTable
    .insert({ lines })
    .select()
    .single()

  if (dbErr) return { error: dbErr.message, feed: null }

  return { error: null, feed: saved as unknown as DashboardFeed }
}
