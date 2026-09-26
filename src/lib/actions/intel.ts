'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { IntelInsert, IntelUpdate } from '@/types/database'
import { logActivity } from './activity-events'
import { validateNoticeTiming } from '@/lib/intel-notice'
import { requirePublishingArchitect, resolvePublishingIdentity } from '@/lib/publishing-identity'

function revalidateIntel(id: string) {
  revalidatePath('/intel')
  revalidatePath(`/intel/${id}`)
  revalidatePath('/admin/intel')
  revalidatePath('/console')
}

// Public intel (unclassified) — accessible to all including guests.
// Enriched with publisher_avatar_url so cards can show the author avatar.
//
// Reads only classified=false rows, so it uses the admin client (no per-user
// data) and is cached 60 s — both required to run inside unstable_cache, which
// forbids cookie access. Cuts 2 DB queries off every console load.
const getPublicIntelCached = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const { data: items } = await admin
      .from('intel')
      .select('*')
      .eq('classified', false)
      .order('timestamp', { ascending: false })

    if (!items?.length) return []

    const publisherIds = [...new Set(items.filter(i => i.publisher_id).map(i => i.publisher_id!))]
    const avatarMap: Record<string, string | null> = {}
    if (publisherIds.length) {
      const { data: profiles } = await admin
        .from('voyager_profiles')
        .select('id, avatar_url')
        .in('id', publisherIds)
      profiles?.forEach(p => { avatarMap[p.id] = p.avatar_url })
    }

    return items.map(i => ({
      ...i,
      publisher_avatar_url: i.publisher_id ? (avatarMap[i.publisher_id] ?? null) : null,
    }))
  },
  ['public-intel'],
  { revalidate: 60 },
)

export async function getPublicIntel() {
  return getPublicIntelCached()
}

// All intel visible to current user — RLS controls classified access
export async function getAllIntel() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('intel')
    .select('*')
    .order('timestamp', { ascending: false })

  if (!items?.length) return []

  const publisherIds = [...new Set(items.filter(i => i.publisher_id).map(i => i.publisher_id!))]
  const avatarMap: Record<string, string | null> = {}
  if (publisherIds.length) {
    const { data: profiles } = await supabase
      .from('voyager_profiles')
      .select('id, avatar_url')
      .in('id', publisherIds)
    profiles?.forEach(p => { avatarMap[p.id] = p.avatar_url })
  }

  return items.map(i => ({
    ...i,
    publisher_avatar_url: i.publisher_id ? (avatarMap[i.publisher_id] ?? null) : null,
  }))
}

export async function getIntelById(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('intel')
    .select('*')
    .eq('id', id)
    .single()

  if (!data) return null
  const publisher = data.publisher_id ? await supabase.from('voyager_profiles').select('avatar_url').eq('id',data.publisher_id).maybeSingle() : {data:null}
  return {...data,publisher_avatar_url:publisher.data?.avatar_url ?? null}
}

export async function createIntel(entry: IntelInsert) {
  const actor = await requirePublishingArchitect()
  if (!actor) return { error: 'Architect access is required.', data: null }
  const validation = validateNoticeTiming(entry)
  if (validation) return { error: validation, data: null }
  let publisher
  try {
    publisher = await resolvePublishingIdentity(entry.publisher_id, actor)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Invalid publishing identity.', data: null }
  }
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('intel')
    .insert({
      ...entry,
      publisher_id: publisher.id,
      publisher_name: publisher.name,
      created_by: actor.id,
      expires_at: entry.tag === 'NOTICE' ? entry.expires_at : null,
    })
    .select()
    .single()

  if (error) return { error: error.message, data: null }
  revalidateIntel(data.id)

  logActivity({
    actor_id:    publisher.id,
    actor_name:  publisher.name,
    actor_role:  publisher.role,
    event_type:  'intel_published',
    target_id:   data.id,
    target_title: entry.title,
    target_image: entry.images?.[0] ?? undefined,
    target_href: `/intel/${data.id}`,
  })

  return { error: null, data }
}

export async function updateIntel(id: string, updates: IntelUpdate) {
  const actor = await requirePublishingArchitect()
  if (!actor) return { error: 'Architect access is required.' }
  const admin = createAdminClient()

  // Fetch current record for snapshot data
  const { data: existing, error: readError } = await admin.from('intel').select('*').eq('id', id).single()
  if (readError || !existing) return { error: readError?.message ?? 'Intel not found.' }
  let normalizedUpdates = updates
  let publisher = null
  if ('publisher_id' in updates || 'publisher_name' in updates) {
    try {
      publisher = await resolvePublishingIdentity(
        updates.publisher_id === undefined ? existing.publisher_id : updates.publisher_id,
        actor,
        existing.publisher_id,
      )
      normalizedUpdates = { ...updates, publisher_id: publisher.id, publisher_name: publisher.name }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Invalid publishing identity.' }
    }
  }
  const merged = { ...existing, ...normalizedUpdates }
  const validation = validateNoticeTiming(merged)
  if (validation) return { error: validation }

  const { error } = await admin
    .from('intel')
    .update({ ...normalizedUpdates, expires_at: merged.tag === 'NOTICE' ? merged.expires_at : null })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidateIntel(id)

  logActivity({
    actor_id:    publisher?.id ?? existing.publisher_id ?? actor.id,
    actor_name:  publisher?.name ?? existing.publisher_name ?? actor.name,
    actor_role:  publisher?.role ?? 'architect',
    event_type:  'intel_updated',
    target_id:   id,
    target_title: normalizedUpdates.title ?? existing.title,
    target_image: (normalizedUpdates.images ?? existing.images)?.[0] ?? undefined,
    target_href: `/intel/${id}`,
  })

  return { error: null }
}

export async function deleteIntel(id: string) {
  if (!(await requirePublishingArchitect())) return { error: 'Architect access is required.' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('intel')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidateIntel(id)
  return { error: null }
}
