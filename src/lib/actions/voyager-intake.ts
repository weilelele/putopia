'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { parseVoyagerIntake, VOYAGER_PROFILE_VERSION } from '@/lib/voyager-intake'
import { recordVoyagerPathActivation } from '@/lib/voyager-path-membership'

export async function getVoyagerIntake() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { userId: null, completed: false }
  const admin = createAdminClient()
  // Private table: ownership comes from the verified session, never caller input.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any).from('voyager_intake').select('version').eq('user_id', user.id).maybeSingle()
  if (error) throw new Error('Your Voyager profile could not be loaded.')
  return { userId: user.id, completed: data?.version === VOYAGER_PROFILE_VERSION }
}

export async function saveVoyagerIntake(raw: unknown): Promise<{ ok: boolean; error?: string; activated?: boolean; worldId?: string | null }> {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { ok: false, error: 'Please log in to save your Voyager profile.' }
  const answers = parseVoyagerIntake(raw)
  if (!answers) return { ok: false, error: 'Please complete all five questions with valid answers.' }
  const admin = createAdminClient()
  // All-or-nothing save + optional observation + activation; retries reuse the profile.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any).rpc('save_voyager_intake', { p_user: user.id, p_answers: answers })
  if (error) {
    console.error('[voyager-profile] save failed:', error.code)
    return { ok: false, error: 'Your profile could not be saved. Please try again. If the Parallax Array is unavailable, you can save without sharing.' }
  }
  if (data.activated) await recordVoyagerPathActivation(user.id)
  for (const path of ['/quiz', '/voyager-path', '/voyager-initiation', '/worlds', '/worlds/live']) revalidatePath(path)
  return { ok: true, activated: data.activated, worldId: data.worldId }
}
