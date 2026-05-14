'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { WorldInsert, WorldUpdate } from '@/types/database'

export async function getAllWorlds() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('worlds')
    .select('*')
    .order('discovery_date', { ascending: true })

  return data ?? []
}

export async function getWorldById(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('worlds')
    .select('*')
    .eq('id', id)
    .single()

  return data
}

// Architect: create a new world record
export async function createWorld(world: WorldInsert) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: null }

  const { data, error } = await supabase
    .from('worlds')
    .insert(world)
    .select()
    .single()

  if (error) return { error: error.message, data: null }
  revalidatePath('/worlds')
  return { error: null, data }
}

// Architect: update a world record
export async function updateWorld(id: string, updates: WorldUpdate) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('worlds')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/worlds')
  return { error: null }
}

// Architect: delete a world record
export async function deleteWorld(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('worlds')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/worlds')
  return { error: null }
}
