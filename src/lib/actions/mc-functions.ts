'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { McFunctionInsert, McFunctionUpdate } from '@/types/database'

// MC console functions rarely change — cache 5 min to keep them off the DB
// on every console load; admin edits self-heal within the window.
const getMcFunctionsCached = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const { data } = await admin
      .from('mc_functions')
      .select('*')
      .order('sort_order', { ascending: true })
    return data ?? []
  },
  ['mc-functions'],
  { revalidate: 300 },
)

export async function getMcFunctions() {
  return getMcFunctionsCached()
}

export async function createMcFunction(fn: McFunctionInsert) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mc_functions')
    .insert(fn as never)
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
    .update(updates as never)
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
