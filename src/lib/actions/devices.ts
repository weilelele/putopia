'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { DeviceInsert, DeviceUpdate } from '@/types/database'
import { logActivity } from './activity-events'

export async function getAllDevices() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('devices')
    .select('*')
    .order('knowledge', { ascending: false })
    .order('id')

  return data ?? []
}

export async function getDeviceById(id: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('devices')
    .select('*')
    .eq('id', id)
    .single()

  return data
}

export async function createDevice(device: DeviceInsert) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('devices')
    .insert(device)
    .select()
    .single()

  if (error) return { error: error.message, data: null }
  revalidatePath('/devices')
  return { error: null, data }
}

export async function updateDevice(id: string, updates: DeviceUpdate) {
  const admin = createAdminClient()

  const { data: existing } = await admin.from('devices').select('name, image_path, current_user_id, current_user_name').eq('id', id).single()

  const { error } = await admin
    .from('devices')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/devices')

  // Log against the current operator if known, else fall back to system
  const actorId   = existing?.current_user_id ?? null
  const actorName = existing?.current_user_name ?? 'Unknown'
  logActivity({
    actor_id:    actorId,
    actor_name:  actorName,
    actor_role:  'voyager',
    event_type:  'device_updated',
    target_id:   id,
    target_title: updates.name ?? existing?.name,
    target_image: updates.image_path ?? existing?.image_path ?? undefined,
    target_href: `/devices/${id}`,
  })

  return { error: null }
}

export async function assignDevice(deviceId: string, voyagerId: string, voyagerName: string) {
  const admin = createAdminClient()

  const { data: existing } = await admin.from('devices').select('name, image_path').eq('id', deviceId).single()

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

  logActivity({
    actor_id:    voyagerId,
    actor_name:  voyagerName,
    actor_role:  'voyager',
    event_type:  'device_updated',
    target_id:   deviceId,
    target_title: existing?.name,
    target_image: existing?.image_path ?? undefined,
    target_href: `/devices/${deviceId}`,
  })

  return { error: null }
}

export async function releaseDevice(deviceId: string) {
  const admin = createAdminClient()

  const { data: existing } = await admin.from('devices').select('name, image_path, current_user_id, current_user_name').eq('id', deviceId).single()

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

  logActivity({
    actor_id:    existing?.current_user_id ?? null,
    actor_name:  existing?.current_user_name ?? 'Unknown',
    actor_role:  'voyager',
    event_type:  'device_updated',
    target_id:   deviceId,
    target_title: existing?.name,
    target_image: existing?.image_path ?? undefined,
    target_href: `/devices/${deviceId}`,
  })

  return { error: null }
}

export async function deleteDevice(id: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('devices')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/devices')
  return { error: null }
}

export async function uploadDeviceImage(formData: FormData) {
  const admin = createAdminClient()

  const file = formData.get('image') as File
  if (!file || file.size === 0) return { error: 'No file provided', url: null }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${Date.now()}.${ext}`

  const { error: uploadError } = await admin.storage
    .from('devices')
    .upload(path, file, { upsert: true })

  if (uploadError) return { error: uploadError.message, url: null }

  const { data: { publicUrl } } = admin.storage
    .from('devices')
    .getPublicUrl(path)

  return { error: null, url: publicUrl }
}

export async function updateExplorationProgress(deviceId: string, progress: number) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('devices')
    .update({ exploration_progress: Math.min(100, Math.max(0, progress)) })
    .eq('id', deviceId)
    .eq('knowledge', 'unknown')

  if (error) return { error: error.message }
  revalidatePath('/devices')
  return { error: null }
}
