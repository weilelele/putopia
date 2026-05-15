'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { WorldInsert, WorldUpdate } from '@/types/database'

export async function getAllWorlds() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('worlds')
    .select('*')
    .order('discovery_date', { ascending: true })

  return data ?? []
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
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('worlds')
    .insert(world)
    .select()
    .single()

  if (error) return { error: error.message, data: null }
  revalidatePath('/worlds')
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
