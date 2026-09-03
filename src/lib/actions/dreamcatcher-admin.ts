'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { requireDreamcatcherArchitect } from '@/lib/dreamcatcher-admin'
import { isPublicationInput, type DreamcatcherPublicationInput } from '@/lib/dreamcatcher-publication'
import { planDreamcatcherSave, type DreamcatcherSaveInput } from '@/lib/dreamcatcher-config'

function refreshDreamcatchers() {
  revalidatePath('/admin/dreamcatchers')
  revalidatePath('/worlds/live')
  revalidatePath('/worlds/submit')
}

export async function setDreamcatcherPublication(input: DreamcatcherPublicationInput): Promise<{ error: string | null }> {
  try {
    await requireDreamcatcherArchitect()
  } catch {
    return { error: 'Architect access is required.' }
  }
  if (!isPublicationInput(input)) return { error: 'Invalid publication change.' }

  // Compare visibility, not updated_at: the queue worker updates that clock every minute.
  // Never overwrite the worker-owned runtime status, queue, or content here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (createAdminClient() as any).from('dreamcatchers')
    .update({ is_public: input.isPublic, updated_at: new Date().toISOString() })
    .eq('id', input.id).eq('is_public', input.expectedIsPublic)
    .select('id').maybeSingle()
  if (error) return { error: 'Could not save publication status. Please try again.' }
  if (!data) return { error: 'This Dreamcatcher changed in another session. Refresh and try again.' }

  refreshDreamcatchers()
  return { error: null }
}

export async function saveDreamcatcher(input: DreamcatcherSaveInput): Promise<{ error: string | null }> {
  try {
    await requireDreamcatcherArchitect()
  } catch {
    return { error: 'Architect access is required.' }
  }
  const plan = planDreamcatcherSave(input)
  if (plan.error !== null) return { error: plan.error }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (createAdminClient() as any).from('dreamcatchers')
  const query = plan.mode === 'create'
    ? table.insert(plan.values)
    : table.update({ ...plan.values, updated_at: new Date().toISOString() })
      .eq('id', plan.id).match(plan.expected)
  const { data, error } = await query.select('id').maybeSingle()
  if (error?.code === '23505') return { error: 'This device ID or code already exists. Choose a different one.' }
  if (error) return { error: 'Could not save the Dreamcatcher. Please try again.' }
  if (!data) return { error: 'This device was changed by someone else. Close the editor and refresh before trying again.' }
  refreshDreamcatchers()
  return { error: null }
}
