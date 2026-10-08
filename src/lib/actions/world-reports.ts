'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { requireNpcArchitect } from '@/lib/npc-repository'
import { getAllWorlds } from '@/lib/actions/worlds'
import { orderFeed } from '@/lib/world-feed-order'
import { withoutHiddenWorldReports } from '@/lib/moderation'
import { getMyDeviceStatus } from '@/lib/actions/device-status'
import { aggregateReportStats, validateDesignation, type ReportKind, type WorldReportStats, type WorldReportView } from '@/lib/world-reports'

type Row = { id: string; world_id: string; kind: ReportKind; author_id: string; body: string; image_urls: string[]; created_at: string }
type Profile = { id: string; display_name: string | null; avatar_url: string | null; role: string }

// The table lands with schema_v84; until then every reader degrades to "no reports".
function reports() {
  const admin = createAdminClient()
  return { admin, table: admin.from('world_reports' as never) as ReturnType<typeof admin.from> }
}

async function authorProfiles(ids: string[]): Promise<Map<string, Profile>> {
  const unique = [...new Set(ids)]
  if (!unique.length) return new Map()
  const { data } = await createAdminClient().from('voyager_profiles').select('id, display_name, avatar_url, role').in('id', unique)
  return new Map(((data ?? []) as Profile[]).map((p) => [p.id, p]))
}

/** Avatars only for Voyagers and Architects, like the member profile sheet. */
function avatarOf(p: Profile | undefined) {
  return p && (p.role === 'voyager' || p.role === 'architect') ? p.avatar_url : null
}

/** Seen (distinct observers) and anomaly counts per world. */
export async function getWorldReportStats(worldIds: string[]): Promise<Record<string, WorldReportStats>> {
  if (!worldIds.length) return {}
  const { table } = reports()
  const { data, error } = await table.select('world_id, kind, author_id').in('world_id', worldIds.slice(0, 200)).eq('is_visible', true)
  if (error) return {}
  return aggregateReportStats((data ?? []) as Pick<Row, 'world_id' | 'kind' | 'author_id'>[])
}

/**
 * The designated first observer of each world — the "by" for official worlds —
 * and the photo they submitted. An official world with no designation is a
 * fuzzy signal. Missing column / table (before schema_v85) reads as "none".
 */
export async function getFirstObservers(worldIds: string[]): Promise<Record<string, { id: string; name: string; avatar: string | null; image: string | null }>> {
  if (!worldIds.length) return {}
  const { admin, table } = reports()
  const { data: worlds, error: worldError } = await admin.from('worlds').select('id, first_observer_report_id').in('id', worldIds.slice(0, 200)).not('first_observer_report_id', 'is', null)
  if (worldError || !worlds?.length) return {}
  const reportToWorld = new Map(worlds.map((w) => [w.first_observer_report_id as string, w.id as string]))
  const { data, error } = await table.select('id, author_id, image_urls').in('id', [...reportToWorld.keys()]).eq('is_visible', true)
  if (error) return {}
  const rows = await withoutHiddenWorldReports((data ?? []) as { id: string; author_id: string; image_urls: string[] | null }[])
  const profiles = await authorProfiles(rows.map((r) => r.author_id))
  const out: Record<string, { id: string; name: string; avatar: string | null; image: string | null }> = {}
  for (const r of rows) {
    const p = profiles.get(r.author_id)
    const worldId = reportToWorld.get(r.id)
    if (p && worldId) out[worldId] = { id: p.id, name: p.display_name ?? 'Unknown', avatar: avatarOf(p), image: r.image_urls?.[0] ?? null }
  }
  return out
}

export async function getWorldReports(worldId: string, kind: ReportKind): Promise<WorldReportView[]> {
  const { admin, table } = reports()
  const { data: worldRow } = await admin.from('worlds').select('first_observer_report_id').eq('id', worldId).maybeSingle()
  const designatedId = worldRow?.first_observer_report_id ?? null
  const { data, error } = await table.select('id, world_id, kind, author_id, body, image_urls, created_at')
    .eq('world_id', worldId).eq('kind', kind).eq('is_visible', true).order('created_at', { ascending: false }).limit(200)
  if (error) return []
  const rows = await withoutHiddenWorldReports((data ?? []) as Row[])
  const profiles = await authorProfiles(rows.map((r) => r.author_id))
  return rows.map((r) => {
    const p = profiles.get(r.author_id)
    return { id: r.id, kind: r.kind, authorId: r.author_id, authorName: p?.display_name ?? 'Unknown', authorAvatar: avatarOf(p), body: r.body, images: r.image_urls ?? [], at: r.created_at.slice(0, 10), isFirstObserver: r.id === designatedId }
  })
}

export async function submitWorldReport(input: {
  worldId: string
  kind: ReportKind
  body: string
  imageUrls: string[]
  /** Architects only: file as this NPC. */
  asProfileId?: string | null
}): Promise<{ error: string | null }> {
  const body = input.body.trim()
  if (body.length < 10 || body.length > 1000) return { error: 'Write between 10 and 1,000 characters.' }
  if (input.kind !== 'observation' && input.kind !== 'anomaly') return { error: 'Invalid report type.' }
  const imageUrls = (input.imageUrls ?? []).filter((u) => typeof u === 'string' && /^https:\/\//.test(u)).slice(0, 3)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Log in to report.' }
  const { admin, table } = reports()

  let authorId = user.id
  let postedById: string | null = null
  if (input.asProfileId && input.asProfileId !== user.id) {
    try { await requireNpcArchitect() } catch { return { error: 'Only architects may report as another identity.' } }
    const { data: target } = await admin.from('voyager_profiles').select('id').eq('id', input.asProfileId).eq('account_kind', 'npc').maybeSingle()
    if (!target) return { error: 'Only NPC identities can be selected.' }
    authorId = target.id
    postedById = user.id
  } else if (!(await getMyDeviceStatus()).has) {
    return { error: 'Reports come from people who hold a device.' }
  }

  const { data: world } = await admin.from('worlds').select('id').eq('id', input.worldId).eq('lifecycle_state', 'stable').maybeSingle()
  if (!world) return { error: 'This world is not open for reports.' }

  const { error } = await table.insert({ world_id: input.worldId, kind: input.kind, author_id: authorId, posted_by_id: postedById, body, image_urls: imageUrls } as never)
  if (error) return { error: 'Could not save the report. Please try again.' }
  revalidatePath('/worlds')
  revalidatePath(`/worlds/${input.worldId}`)
  return { error: null }
}

/**
 * Architect only: designate (or, with null, clear) the observation that makes
 * its author the first observer of an official world. Designating takes the
 * world out of its fuzzy state; clearing returns it to fuzzy.
 */
export async function designateFirstObserver(worldId: string, reportId: string | null): Promise<{ error: string | null }> {
  try { await requireNpcArchitect() } catch { return { error: 'Architect permission required.' } }
  const admin = createAdminClient()
  const { data: world } = await admin.from('worlds').select('id, lifecycle_state').eq('id', worldId).maybeSingle()
  if (!world) return { error: 'World not found.' }
  if (reportId !== null) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId)) return { error: 'Invalid report.' }
    const { data: report } = await (admin.from('world_reports' as never) as ReturnType<typeof admin.from>)
      .select('world_id, kind, is_visible').eq('id', reportId).maybeSingle()
    const invalid = validateDesignation(world, report as { world_id: string; kind: string; is_visible: boolean } | null)
    if (invalid) return { error: invalid }
  } else if (!worldId.startsWith('WLD-')) {
    return { error: 'Only official worlds have a first observer to designate.' }
  }
  const { error } = await admin.from('worlds').update({ first_observer_report_id: reportId } as never).eq('id', worldId)
  if (error) return { error: 'Could not save. Apply schema_v85 first.' }
  revalidatePath('/worlds')
  revalidatePath(`/worlds/${worldId}`)
  return { error: null }
}

/** World ids in the Observe list's order — what swiping on a world page walks through. */
export async function getObserveOrder(): Promise<string[]> {
  const worlds = [...(await getAllWorlds())].reverse()
  const observers = await getFirstObservers(worlds.map((w) => w.id)).catch(() => ({} as Awaited<ReturnType<typeof getFirstObservers>>))
  return orderFeed(worlds, (w) => !!(w.image_path ?? observers[w.id]?.image)).map((w) => w.id)
}
