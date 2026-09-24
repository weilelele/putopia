'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { WorldInsert, WorldUpdate, WorldFinalAsset, WorldFinalMedia } from '@/types/database'
import { rollScanUntil } from '@/lib/signal/scan'
import { logActivity } from './activity-events'
import { requirePublishingArchitect, resolvePublishingIdentity } from '@/lib/publishing-identity'

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
  const { data } = await admin
    .from('worlds')
    .select('*')
    .in('lifecycle_state', ['proposed', 'picked', 'syncing'])
    .order('submitted_at', { ascending: false })

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
  // Share the legacy World entry with the atomic Parallax Array submission RPC.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: worldId, error } = await (admin as any).rpc('create_observation_world', {
    p_user: user.id, p_name: payload.name, p_name_en: payload.name_en || payload.name,
    p_description: payload.description, p_discoverer_name: discovererName,
    p_gradient_from: payload.gradient_from ?? '#1a1a2e',
    p_gradient_to: payload.gradient_to ?? '#16213e',
    p_scan_until: rollScanUntil(Date.now(), Math.random()), p_dreamcatcher: null,
  })
  if (error) return { error: error.message, data: null }
  const { data, error: readError } = await admin.from('worlds').select('*').eq('id', worldId).single()
  if (readError || !data) return { error: 'Observation accepted. Refresh to see its record.', data: null }

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

/** Submit a world to one specific Parallax Array. The device queue, rather than
 * submission time, decides when Signal Scanning begins. */
export async function submitDreamcatcherWorld(payload: {
  dreamcatcherSlug: string
  submissionKey: string
  name: string
  description: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please log in before submitting an observation.', data: null }

  if (!process.env.COSMO_MONGO_URI?.trim()) return { error: 'Observation submission is temporarily unavailable. Please try again later.', data: null }

  const name = payload.name.trim()
  const description = payload.description.trim()
  if (!name || name.length > 80 || description.length < 20 || description.length > 2000) {
    return { error: 'Add a name and a description between 20 and 2,000 characters.', data: null }
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('voyager_profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || !['applicant', 'voyager', 'architect'].includes(profile.role)) {
    return { error: 'Applicant access or above is required.', data: null }
  }

  if (!/^[0-9a-f-]{36}$/i.test(payload.submissionKey)) return { error: 'Invalid submission key', data: null }
  // One transaction creates the world, thread, first round and generation outbox.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  const { data: worldId, error } = await db.rpc('submit_dreamcatcher_round_world', {
    p_user: user.id, p_slug: payload.dreamcatcherSlug, p_name: name,
    p_description: description, p_key: payload.submissionKey,
  })
  if (error) return { error: error.code === '23505' ? 'This submission is already recorded. Check My Observations before trying again.' : error.message, data: null }
  const { data: world } = await admin.from('worlds').select('*').eq('id', worldId).single()
  if (!world) return { error: 'Observation accepted. Refresh to see its progress.', data: null }
  const discovererName = profile.display_name?.trim() || 'Operative'
  revalidatePath('/worlds/live')
  revalidatePath('/worlds')
  logActivity({
    actor_id: user.id,
    actor_name: discovererName,
    actor_role: profile.role,
    event_type: 'world_added',
    target_id: world.id,
    target_title: name,
    target_href: `/worlds/${encodeURIComponent(world.id)}`,
  })
  return { error: null, data: world }
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
    .select('submitted_by, discoverer_id, dreamcatcher_id')
    .eq('id', worldId)
    .maybeSingle()
  if (!world) return { ok: false, error: 'World not found' }
  if (user.id !== world.submitted_by && user.id !== world.discoverer_id) {
    return { ok: false, error: 'Not allowed' }
  }

  const { data: roundJob } = await (admin as any).from('dreamcatcher_jobs').select('id').eq('world_id', worldId).eq('orchestration', 'dreamcatcher_rounds').maybeSingle() // eslint-disable-line @typescript-eslint/no-explicit-any
  if (roundJob) return { ok: false, error: 'Parallax Array rounds are managed by the device queue.' }

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
  const { data: transitioned, error } = await admin.from('worlds').update({ lifecycle_state: 'stable', image_path: poster }).eq('id', worldId).neq('lifecycle_state', 'stable').select('id,name,name_en').maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (transitioned) {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    const { data: actor } = user ? await admin.from('voyager_profiles').select('display_name').eq('id', user.id).maybeSingle() : { data: null }
    await logActivity({ actor_id: user?.id ?? null, actor_name: actor?.display_name ?? 'Collective', actor_role: 'architect', event_type: 'world_established', target_id: worldId, target_title: transitioned.name_en || transitioned.name, target_image: poster, target_href: `/worlds/${encodeURIComponent(worldId)}` })
    revalidatePath('/console')
  }
  if (!transitioned) {
    const { error: posterError } = await admin.from('worlds').update({ image_path: poster }).eq('id', worldId).eq('lifecycle_state', 'stable')
    if (posterError) return { ok: false, error: posterError.message }
  }
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

export async function createWorld(world: WorldInsert) {
  const actor = await requirePublishingArchitect()
  if (!actor) return { error: 'Architect access is required.', data: null }
  let discoverer
  try {
    discoverer = await resolvePublishingIdentity(world.discoverer_id, actor)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Invalid publishing identity.', data: null }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('worlds')
    .insert({ ...world, discoverer_id: discoverer.id, discoverer_name: discoverer.name })
    .select()
    .single()

  if (error) return { error: error.message, data: null }
  revalidatePath('/worlds')

  logActivity({
    actor_id:    discoverer.id,
    actor_name:  discoverer.name,
    actor_role:  discoverer.role,
    event_type:  'world_added',
    target_id:   data.id,
    target_title: world.name_en ?? world.name,
    target_image: world.image_path ?? undefined,
    target_href: `/worlds/${encodeURIComponent(data.id)}`,
  })

  return { error: null, data }
}

export async function updateWorld(id: string, updates: WorldUpdate) {
  const actor = await requirePublishingArchitect()
  if (!actor) return { error: 'Architect access is required.' }
  const admin = createAdminClient()
  const { data: world, error: readError } = await admin
    .from('worlds')
    .select('discoverer_id')
    .eq('id', id)
    .maybeSingle()
  if (readError) return { error: readError.message }
  if (!world) return { error: 'World not found.' }

  let normalizedUpdates = updates
  if ('discoverer_id' in updates || 'discoverer_name' in updates) {
    try {
      const discoverer = await resolvePublishingIdentity(
        updates.discoverer_id === undefined ? world.discoverer_id : updates.discoverer_id,
        actor,
        world.discoverer_id,
      )
      normalizedUpdates = { ...updates, discoverer_id: discoverer.id, discoverer_name: discoverer.name }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Invalid publishing identity.' }
    }
  }

  const { error } = await admin
    .from('worlds')
    .update(normalizedUpdates)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/worlds')
  return { error: null }
}

export async function deleteWorld(id: string) {
  if (!(await requirePublishingArchitect())) return { error: 'Architect access is required.' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('worlds')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/worlds')
  return { error: null }
}

/** End an exploration without deleting its rounds or published history. */
export async function stopDreamcatcherWorld(worldId: string) {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { ok: false, error: 'Please log in first' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (createAdminClient() as any).rpc('stop_dreamcatcher_world', { p_world: worldId, p_user: user.id })
  revalidatePath('/worlds/live')
  revalidatePath(`/worlds/${worldId}`)
  return error ? { ok: false, error: error.message } : { ok: true }
}

/** Safe round status for world history. Never returns unpublished asset URLs. */
export async function getDreamcatcherProgress(worldId: string) {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: round, error } = await admin.from('dreamcatcher_rounds')
    .select('id,round_number,status,initiator_id,dreamcatcher_generation_requests(status)')
    .eq('world_id',worldId).order('round_number',{ascending:false}).limit(1).maybeSingle()
  if (error) throw new Error('Round progress unavailable')
  if (!round) return null
  const generation = round.dreamcatcher_generation_requests
  return { roundNumber: round.round_number as number, status: round.status as string,
    generationStatus: (Array.isArray(generation) ? generation[0]?.status : generation?.status) as string | undefined,
    canStop: user?.id === round.initiator_id && !['settled','cancelled'].includes(round.status) }
}
