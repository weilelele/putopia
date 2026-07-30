'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  getAdminDeviceBatch,
  getPublicDeviceBatch,
} from '@/lib/device-batch-repository'
import {
  sendBatchMajorUpdateNotifications,
  sendDistributionStageNotifications,
} from '@/lib/device-batch-notifications'

export type FollowActionResult = {
  error: string | null
  followed: boolean
}

async function requireArchitect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  return profile?.role === 'architect'
}

export async function getMyDeviceBatchFollows(): Promise<string[] | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('device_batch_follows') as any)
    .select('batch_slug')
    .eq('user_id', user.id)

  if (error) return null

  return (data ?? []).map((row: { batch_slug: string }) => row.batch_slug)
}

export async function setMyDeviceBatchFollow(
  batchSlug: string,
  followed: boolean,
): Promise<FollowActionResult> {
  const batch = await getPublicDeviceBatch(batchSlug)
  if (!batch) return { error: 'Batch not found', followed: false }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication required', followed: false }

  if (!followed) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('device_batch_follows') as any)
      .delete()
      .eq('user_id', user.id)
      .eq('batch_slug', batch.slug)
    return { error: error?.message ?? null, followed: !!error }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('device_batch_follows') as any)
    .upsert({
      user_id: user.id,
      batch_slug: batch.slug,
      email_enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,batch_slug' })
  if (error) return { error: error.message, followed: false }

  revalidatePath('/devices')
  revalidatePath('/devices/my-consoles')
  return { error: null, followed: true }
}

export async function sendBatchMajorUpdate(input: {
  batchSlug: string
  date: string
  title: string
  body: string
}) {
  if (!(await requireArchitect())) return { error: 'Forbidden' }
  if (!(await getAdminDeviceBatch(input.batchSlug))) {
    return { error: 'Batch not found' }
  }
  if (!input.title.trim() || !input.body.trim()) return { error: 'Title and body are required' }
  if (input.title.length > 160 || input.body.length > 4_000) {
    return { error: 'Update content is too long' }
  }

  const result = await sendBatchMajorUpdateNotifications({
    batchSlug: input.batchSlug,
    date: input.date.trim(),
    title: input.title.trim(),
    body: input.body.trim(),
  })
  return { error: result.failed ? `${result.failed} email(s) failed` : null, ...result }
}

export async function sendBatchDistributionUpdate(input: {
  batchSlug: string
  stage: {
    id: string
    label: string
    status: 'completed' | 'current' | 'upcoming'
    summary: string
    window: string
  }
}) {
  if (!(await requireArchitect())) return { error: 'Forbidden' }
  if (!(await getAdminDeviceBatch(input.batchSlug))) {
    return { error: 'Batch not found' }
  }
  if (input.stage.status === 'upcoming') {
    return { error: 'Only current or completed stages can be emailed' }
  }

  const result = await sendDistributionStageNotifications(input)
  return { error: result.failed ? `${result.failed} email(s) failed` : null, ...result }
}
