'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
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

// All intel (classified + unclassified) — voyager+ only; RLS enforces this
export async function getAllIntel() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('intel')
    .select('*')
    .order('timestamp', { ascending: false })

  return data ?? []
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

// Architect: publish a new intel entry
export async function createIntel(entry: IntelInsert) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: null }

  const { data, error } = await supabase
    .from('intel')
    .insert({ ...entry, created_by: user.id })
    .select()
    .single()

  if (error) return { error: error.message, data: null }
  revalidatePath('/intel')
  return { error: null, data }
}

// Architect: update an intel entry
export async function updateIntel(id: string, updates: IntelUpdate) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('intel')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/intel')
  return { error: null }
}

// Architect: delete an intel entry
export async function deleteIntel(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('intel')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/intel')
  return { error: null }
}
