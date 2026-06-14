'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { VoyagerProfileUpdate } from '@/types/database'
import { upsertLoopsContact } from '@/lib/loops'

export async function syncLoopsRegistration(
  email: string,
  displayName: string,
  userId: string,
): Promise<void> {
  await upsertLoopsContact({
    email,
    firstName: displayName,
    userId,
    userGroup: 'registered',
    registered: true,
  })
}

export async function getMyProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('voyager_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

export async function updateProfile(updates: VoyagerProfileUpdate) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('voyager_profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/profile')
  revalidatePath('/voyagers')
  return { error: null }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', url: null }

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) return { error: 'No file provided', url: null }

  const ext = file.name.split('.').pop()
  const path = `${user.id}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (uploadError) return { error: uploadError.message, url: null }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(path)

  await supabase
    .from('voyager_profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)

  revalidatePath('/profile')
  revalidatePath('/voyagers')
  return { error: null, url: publicUrl }
}

export async function getAllVoyagers() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('voyager_profiles')
    .select('*')
    .in('role', ['voyager', 'architect'])
    .order('joined_at', { ascending: true })

  return data ?? []
}

export async function getVoyagerById(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('voyager_profiles')
    .select('*')
    .eq('id', id)
    .single()
  return data ?? null
}

// Architect-only: reassign a voyager's batch (writes past RLS via service role).
export async function setVoyagerBatch(voyagerId: string, batchLabel: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (me?.role !== 'architect') return { error: 'Forbidden' }

  const label = batchLabel.trim() || 'Original Batch'
  const admin = createAdminClient()
  // batch_label is admin-managed, not in the RLS-restricted VoyagerProfileUpdate type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('voyager_profiles') as any)
    .update({ batch_label: label })
    .eq('id', voyagerId)

  if (error) return { error: error.message }
  revalidatePath('/voyagers')
  revalidatePath('/admin/voyagers')
  return { error: null }
}

export async function searchMembers(query: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('voyager_profiles')
    .select('id, display_name, role')
    .in('role', ['voyager', 'architect'])
    .ilike('display_name', `%${query}%`)
    .order('display_name')
    .limit(10)

  return (data ?? []) as { id: string; display_name: string; role: string }[]
}
