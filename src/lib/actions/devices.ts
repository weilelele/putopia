'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { DeviceInsert, DeviceUpdate } from '@/types/database'

export async function getAllDevices() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('devices')
    .select('*')
    .order('knowledge', { ascending: false })   // known first
    .order('id')

  return data ?? []
}

export async function getDeviceById(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('devices')
    .select('*')
    .eq('id', id)
    .single()

  return data
}

// Architect: create a new device
export async function createDevice(device: DeviceInsert) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('devices')
    .insert(device)
    .select()
    .single()

  if (error) return { error: error.message, data: null }
  revalidatePath('/devices')
  return { error: null, data }
}

// Architect: update device info or status
export async function updateDevice(id: string, updates: DeviceUpdate) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('devices')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/devices')
  return { error: null }
}

// Architect: assign a voyager to a known device
export async function assignDevice(deviceId: string, voyagerId: string, voyagerName: string) {
  const admin = await createAdminClient()
  const { error } = await admin
    .from('devices')
    .update({
      status: 'in_use',
      current_user_id: voyagerId,
      current_user_name: voyagerName,
    })
    .eq('id', deviceId)

  if (error) return { error: error.message }
  revalidatePath('/devices')
  return { error: null }
}

// Architect: release a device (mark as available)
export async function releaseDevice(deviceId: string) {
  const admin = await createAdminClient()
  const { error } = await admin
    .from('devices')
    .update({
      status: 'available',
      current_user_id: null,
      current_user_name: null,
    })
    .eq('id', deviceId)

  if (error) return { error: error.message }
  revalidatePath('/devices')
  return { error: null }
}

// Architect: delete a device
export async function deleteDevice(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/devices')
  return { error: null }
}

// Architect: upload a device image to Supabase Storage, returns the public URL
export async function uploadDeviceImage(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', url: null }

  const file = formData.get('image') as File
  if (!file || file.size === 0) return { error: 'No file provided', url: null }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('devices')
    .upload(path, file, { upsert: true })

  if (uploadError) return { error: uploadError.message, url: null }

  const { data: { publicUrl } } = supabase.storage
    .from('devices')
    .getPublicUrl(path)

  return { error: null, url: publicUrl }
}

// Architect: update exploration progress for an unknown device
export async function updateExplorationProgress(deviceId: string, progress: number) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('devices')
    .update({ exploration_progress: Math.min(100, Math.max(0, progress)) })
    .eq('id', deviceId)
    .eq('knowledge', 'unknown')

  if (error) return { error: error.message }
  revalidatePath('/devices')
  return { error: null }
}
