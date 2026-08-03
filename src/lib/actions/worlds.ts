'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { WorldInsert, WorldUpdate, WorldFinalAsset, WorldFinalMedia } from '@/types/database'
import { rollScanUntil } from '@/lib/signal/scan'
import { logActivity } from './activity-events'

/** Stable / verified worlds (the main archive). Public + identical for everyone,
 *  so cached 60 s to cut DB load on the console; edits self-heal within the window. */
const getAllWorldsCached = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const { data } = await admin
      .from('worlds')
      .select('*')
      .eq('lifecycle_state', 'stable')
      .order('discovery_date', { ascending: true })
      .limit(500)
    // Exclude test-console worlds (JS-side so a missing column never errors).
    return (data ?? []).filter((w) => !w.is_test)
  },
  ['all-worlds-stable'],
  { revalidate: 60 },
)

export async function getAllWorlds() {
  return getAllWorldsCached()
}

/** Community pipeline: worlds still in flight — Raw Imagination (proposed) and
 *  Signal Tuning (picked | syncing). Established (stable) worlds come from
 *  getAllWorlds. */
export async function getPipelineWorlds() {
  const admin = createAdminClient()
  // Poster/card columns only — the pipeline grid never reads the scan/vote
  // bookkeeping columns.
  const { data } = await admin
    .from('worlds')
    .select('id, name, name_en, description, gradient_from, gradient_to, image_path, discoverer_name, discoverer_id, submitted_by, submitted_at, lifecycle_state, is_test')
    .in('lifecycle_state', ['proposed', 'picked', 'syncing'])
    .order('submitted_at', { ascending: false })
    .limit(200)

  // Exclude test-console worlds (JS-side so a missing column never errors).
  const worlds = (data ?? []).filter((w) => !w.is_test)
  if (!worlds.length) return []

  // Enrich each world with its discoverer's avatar (cards show author + avatar).
  const personIds = [...new Set(
    worlds.map(w => w.discoverer_id ?? w.submitted_by).filter(Boolean) as string[],
  )]
  const avatarMap: Record<string, string | null> = {}
  if (personIds.length) {
    const { data: profiles } = await admin
      .from('voyager_profiles')
      .select('id, avatar_url')
      .in('id', personIds)
    profiles?.forEach(p => { avatarMap[p.id] = p.avatar_url })
  }

  return worlds.map(w => {
    const personId = w.discoverer_id ?? w.submitted_by
    return {
      ...w,
      discoverer_avatar_url: personId ? (avatarMap[personId] ?? null) : null,
    }
  })
}

/** Submit a user-proposed world sighting. */
export async function submitWorld(payload: {
  name: string
  name_en: string
  description: string
  gradient_from?: string
  gradient_to?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: null }

  // Get profile info for discoverer_name
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('voyager_profiles')
    .select('id, display_name, role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found', data: null }

  const discovererName = profile.display_name?.trim() || user.email?.split('@')[0] || 'Unknown Operative'
  const worldId = `PROP-${Date.now().toString(36).toUpperCase()}`

  const { data, error } = await admin
    .from('worlds')
    .insert({
      id: worldId,
      name: payload.name,
      name_en: payload.name_en || payload.name,
      discoverer_id: user.id,
      discoverer_name: discovererName,
      discovery_date: new Date().toISOString().split('T')[0],
      gradient_from: payload.gradient_from ?? '#1a1a2e',
      gradient_to: payload.gradient_to ?? '#16213e',
      image_path: null,
      description: payload.description,
      is_verified: false,
      lifecycle_state: 'proposed',
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),
      // Roll the Signal Scanning window — the first reading returns in 8-10h.
      scan_until: rollScanUntil(Date.now(), Math.random()),
    })
    .select()
    .single()

  if (error) return { error: error.message, data: null }

  revalidatePath('/worlds')

  logActivity({
    actor_id:    user.id,
    actor_name:  discovererName,
    actor_role:  profile.role ?? 'applicant',
    event_type:  'world_added',
    target_id:   data.id,
    target_title: payload.name_en || payload.name,
    target_href: `/worlds/${encodeURIComponent(data.id)}`,
  })

  return { error: null, data }
}

/**
 * Re-run the Signal Scanning ceremony for a world (owner only). Used from the
 * "no signal returned" state: the proposer can revise their field notes and try
 * again — each retry re-rolls a fresh 8-10h scan window.
 */
export async function rescanWorld(worldId: string, patch?: { description?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: world } = await admin
    .from('worlds')
    .select('submitted_by, discoverer_id')
    .eq('id', worldId)
    .maybeSingle()
  if (!world) return { ok: false, error: 'World not found' }
  if (user.id !== world.submitted_by && user.id !== world.discoverer_id) {
    return { ok: false, error: 'Not allowed' }
  }

  // Re-roll the scan window and clear the prior outcome so it re-resolves
  // (success/failure email) when this fresh scan completes.
  const update: WorldUpdate = { scan_until: rollScanUntil(Date.now(), Math.random()), scan_resolved_at: null }
  const desc = patch?.description?.trim()
  if (desc && desc.length >= 20) update.description = desc

  const { error } = await admin.from('worlds').update(update).eq('id', worldId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/worlds/${worldId}`)
  return { ok: true }
}

/**
 * Upload an image for a world and record it in world_images.
 * Pass the file as a Buffer (read server-side from FormData).
 */
export async function addWorldImage(params: {
  worldId: string
  file: Buffer
  fileName: string
  contentType: string
  caption?: string
  source?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', url: null }

  const admin = createAdminClient()
  const storagePath = `${params.worldId}/${Date.now()}-${params.fileName}`

  const { error: uploadError } = await admin.storage
    .from('world-images')
    .upload(storagePath, params.file, { contentType: params.contentType, upsert: false })

  if (uploadError) return { error: uploadError.message, url: null }

  const { data: { publicUrl } } = admin.storage
    .from('world-images')
    .getPublicUrl(storagePath)

  const { error: dbError } = await admin
    .from('world_images')
    .insert({
      world_id:     params.worldId,
      url:          publicUrl,
      storage_path: storagePath,
      caption:      params.caption ?? null,
      source:       params.source ?? 'upload',
      uploaded_by:  user.id,
    })

  if (dbError) return { error: dbError.message, url: null }

  return { error: null, url: publicUrl }
}

// ─── Final Form (the exit from Signal Tuning → Archive World) ──────────────────

/** True if the caller is a signed-in architect. */
async function callerIsArchitect(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const admin = createAdminClient()
  const { data } = await admin.from('voyager_profiles').select('role').eq('id', user.id).maybeSingle()
  return data?.role === 'architect'
}

/**
 * Upload one Final Form asset (image or video) for a world. For video the caller
 * passes a poster Buffer (the first frame, captured client-side) so the world gets
 * a still poster; for images the asset itself is the poster. Architect only.
 */
export async function addFinalFormAsset(params: {
  worldId: string
  media: WorldFinalMedia
  file: Buffer
  fileName: string
  contentType: string
  poster?: Buffer
  posterContentType?: string
}): Promise<{ error: string | null; asset: WorldFinalAsset | null }> {
  if (!(await callerIsArchitect())) return { error: 'Architect role required', asset: null }
  const admin = createAdminClient()
  const stamp = Date.now()
  const path = `${params.worldId}/final/${stamp}-${params.fileName}`

  const { error: upErr } = await admin.storage
    .from('world-images')
    .upload(path, params.file, { contentType: params.contentType, upsert: false })
  if (upErr) return { error: upErr.message, asset: null }
  const { data: { publicUrl } } = admin.storage.from('world-images').getPublicUrl(path)

  let posterUrl: string | null = publicUrl // images are their own poster
  if (params.media === 'video' && params.poster) {
    const posterPath = `${params.worldId}/final/${stamp}-poster.jpg`
    const { error: pErr } = await admin.storage
      .from('world-images')
      .upload(posterPath, params.poster, { contentType: params.posterContentType ?? 'image/jpeg', upsert: false })
    posterUrl = pErr ? null : admin.storage.from('world-images').getPublicUrl(posterPath).data.publicUrl
  }

  // Append after any existing assets.
  const { count } = await admin.from('world_final_assets').select('id', { count: 'exact', head: true }).eq('world_id', params.worldId)
  const { data, error } = await admin
    .from('world_final_assets')
    .insert({ world_id: params.worldId, media: params.media, url: publicUrl, poster_url: posterUrl, storage_path: path, sort_order: count ?? 0 })
    .select()
    .single()
  if (error) return { error: error.message, asset: null }
  return { error: null, asset: data as WorldFinalAsset }
}

/**
 * Record a Final Form asset already uploaded to storage (browser-direct, so big
 * videos don't hit the serverless body limit). Architect only.
 */
export async function recordFinalFormAsset(params: {
  worldId: string
  media: WorldFinalMedia
  url: string
  posterUrl?: string | null
  storagePath?: string | null
}): Promise<{ error: string | null; asset: WorldFinalAsset | null }> {
  if (!(await callerIsArchitect())) return { error: 'Architect role required', asset: null }
  const admin = createAdminClient()
  const { count } = await admin.from('world_final_assets').select('id', { count: 'exact', head: true }).eq('world_id', params.worldId)
  const { data, error } = await admin
    .from('world_final_assets')
    .insert({
      world_id: params.worldId,
      media: params.media,
      url: params.url,
      poster_url: params.posterUrl ?? (params.media === 'image' ? params.url : null),
      storage_path: params.storagePath ?? null,
      sort_order: count ?? 0,
    })
    .select()
    .single()
  if (error) return { error: error.message, asset: null }
  return { error: null, asset: data as WorldFinalAsset }
}

/** A world's Final Form assets, carousel order. */
export async function listFinalFormAssets(worldId: string): Promise<WorldFinalAsset[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('world_final_assets')
    .select('*')
    .eq('world_id', worldId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  return (data ?? []) as WorldFinalAsset[]
}

/** Remove a Final Form asset (and its storage object). Architect only. */
export async function removeFinalFormAsset(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await callerIsArchitect())) return { ok: false, error: 'Architect role required' }
  const admin = createAdminClient()
  const { data: row } = await admin.from('world_final_assets').select('storage_path').eq('id', id).maybeSingle()
  if (row?.storage_path) await admin.storage.from('world-images').remove([row.storage_path])
  const { error } = await admin.from('world_final_assets').delete().eq('id', id)
  return error ? { ok: false, error: error.message } : { ok: true }
}

/**
 * Graduate a world from Signal Tuning to an Established (Archive) World: requires
 * at least one Final Form asset, sets lifecycle_state → 'stable', and makes the
 * first asset's poster the world's list image. Architect only.
 */
export async function graduateWorld(worldId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await callerIsArchitect())) return { ok: false, error: 'Architect role required' }
  const admin = createAdminClient()
  const { data: first } = await admin
    .from('world_final_assets')
    .select('url, poster_url')
    .eq('world_id', worldId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!first) return { ok: false, error: 'Add a Final Form asset before graduating' }

  const poster = first.poster_url ?? first.url
  const { error } = await admin.from('worlds').update({ lifecycle_state: 'stable', image_path: poster }).eq('id', worldId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/worlds')
  revalidatePath(`/worlds/${worldId}`)
  return { ok: true }
}

export async function getWorldById(id: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('worlds')
    .select('*')
    .eq('id', id)
    .single()

  return data
}

export async function createWorld(world: WorldInsert, actor?: { id: string; name: string; role: string }) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('worlds')
    .insert(world)
    .select()
    .single()

  if (error) return { error: error.message, data: null }
  revalidatePath('/worlds')

  logActivity({
    actor_id:    actor?.id ?? null,
    actor_name:  actor?.name ?? world.discoverer_name ?? 'Unknown',
    actor_role:  actor?.role ?? 'architect',
    event_type:  'world_added',
    target_id:   data.id,
    target_title: world.name_en ?? world.name,
    target_image: world.image_path ?? undefined,
    target_href: `/worlds/${encodeURIComponent(data.id)}`,
  })

  return { error: null, data }
}

export async function updateWorld(id: string, updates: WorldUpdate) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('worlds')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/worlds')
  return { error: null }
}

export async function deleteWorld(id: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('worlds')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/worlds')
  return { error: null }
}
