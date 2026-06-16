'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { WorldInsert, WorldUpdate } from '@/types/database'
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
    return data ?? []
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

  return data ?? []
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
