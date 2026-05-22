'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { IntelInsert, IntelUpdate } from '@/types/database'

// Public intel (unclassified) — accessible to all including guests
export async function getPublicIntel() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('intel')
    .select('*')
    .eq('classified', false)
    .order('timestamp', { ascending: false })

  return data ?? []
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
  return { error: null, data }
}

export async function updateIntel(id: string, updates: IntelUpdate) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('intel')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/intel')
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
