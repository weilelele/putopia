'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { requireNpcArchitect } from '@/lib/npc-repository'
import { validateNpcVoice } from '@/lib/npc-voice'

export async function saveNpcVoice(id: string, instructions: string) {
  const actor = await requireNpcArchitect()
  const invalid = validateNpcVoice(instructions)
  if (invalid) return { error: invalid }
  const admin = createAdminClient()
  const { data, error } = await admin.from('voyager_profiles').select('id').eq('id', id).eq('account_kind', 'npc').maybeSingle()
  if (error || !data) return { error: 'NPC not found.' }
  const { error: writeError } = await admin.from('npc_voice_profiles').upsert({ user_id: id, instructions, updated_by: actor, updated_at: new Date().toISOString() })
  if (writeError) return { error: 'Could not save language and behavior. Please retry.' }
  revalidatePath(`/admin/npcs/${id}`)
  return { error: null }
}
