'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { McFunctionInsert, McFunctionUpdate } from '@/types/database'

export async function getMcFunctions() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('mc_functions')
    .select('*')
    .order('sort_order', { ascending: true })
  return data ?? []
}

export async function createMcFunction(fn: McFunctionInsert) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mc_functions')
    .insert(fn)
    .select()
    .single()
  if (error) return { error: error.message, data: null }
  revalidatePath('/console')
  revalidatePath('/admin/mc-config')
  return { error: null, data }
}

export async function updateMcFunction(id: string, updates: McFunctionUpdate) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('mc_functions')
    .update(updates)
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/console')
  revalidatePath('/admin/mc-config')
  return { error: null }
}

export async function deleteMcFunction(id: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('mc_functions')
    .delete()
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/console')
  revalidatePath('/admin/mc-config')
  return { error: null }
}
