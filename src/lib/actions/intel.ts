'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { IntelInsert, IntelUpdate } from '@/types/database'
import { logActivity } from './activity-events'

// Public intel (unclassified) — accessible to all including guests.
// Enriched with publisher_avatar_url so cards can show the author avatar.
export async function getPublicIntel() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('intel')
    .select('*')
    .eq('classified', false)
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

  return data
}

export async function createIntel(entry: IntelInsert) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('intel')
    .insert(entry)
    .select()
    .single()

  if (error) return { error: error.message, data: null }
  revalidatePath('/intel')

  logActivity({
    actor_id:    entry.publisher_id ?? null,
    actor_name:  entry.publisher_name ?? 'Unknown',
    actor_role:  'architect',
    event_type:  'intel_published',
    target_id:   data.id,
    target_title: entry.title,
    target_image: entry.images?.[0] ?? undefined,
    target_href: `/intel/${data.id}`,
  })

  return { error: null, data }
}

export async function updateIntel(id: string, updates: IntelUpdate) {
  const admin = createAdminClient()

  // Fetch current record for snapshot data
  const { data: existing } = await admin.from('intel').select('title, images, publisher_id, publisher_name').eq('id', id).single()

  const { error } = await admin
    .from('intel')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/intel')

  logActivity({
    actor_id:    existing?.publisher_id ?? null,
    actor_name:  existing?.publisher_name ?? 'Unknown',
    actor_role:  'architect',
    event_type:  'intel_updated',
    target_id:   id,
    target_title: updates.title ?? existing?.title,
    target_image: (updates.images ?? existing?.images)?.[0] ?? undefined,
    target_href: `/intel/${id}`,
  })

  return { error: null }
}

export async function deleteIntel(id: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('intel')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/intel')
  return { error: null }
}
