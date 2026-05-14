'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { VoyagerProfileUpdate } from '@/types/database'

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
  return { error: null, url: publicUrl }
}

export async function getAllVoyagers() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('voyager_profiles')
    .select('id, display_name, bio, avatar_url, location, role, observation_days, worlds_discovered, joined_at')
    .in('role', ['voyager', 'architect'])
    .order('joined_at', { ascending: false })

  return data ?? []
}
