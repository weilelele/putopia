'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type {
  OnboardingVariantRow,
  OnboardingVariantInsert,
  OnboardingVariantUpdate,
} from '@/types/database'

function revalidate() {
  revalidatePath('/new')
  revalidatePath('/admin/onboarding-preview')
}

export async function getOnboardingVariants(): Promise<OnboardingVariantRow[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('onboarding_variants')
    .select('*')
    .order('sort_order', { ascending: true })
  return (data ?? []) as unknown as OnboardingVariantRow[]
}

export async function createOnboardingVariant(row: OnboardingVariantInsert) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('onboarding_variants')
    .insert(row as never)
    .select()
    .single()
  if (error) return { error: error.message, data: null }
  revalidate()
  return { error: null, data: data as unknown as OnboardingVariantRow }
}

export async function updateOnboardingVariant(id: string, updates: OnboardingVariantUpdate) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('onboarding_variants')
    .update({ ...updates, updated_at: new Date().toISOString() } as never)
    .eq('id', id)
  if (error) return { error: error.message }
  revalidate()
  return { error: null }
}

export async function deleteOnboardingVariant(id: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('onboarding_variants')
    .delete()
    .eq('id', id)
  if (error) return { error: error.message }
  revalidate()
  return { error: null }
}

/** Upload a video to the `onboarding` bucket; returns its public URL. */
export async function uploadOnboardingVideo(formData: FormData) {
  const admin = createAdminClient()

  const file = formData.get('video') as File
  if (!file || file.size === 0) return { error: 'No file provided', url: null }

  const ext = file.name.split('.').pop() ?? 'mp4'
  const path = `${Date.now()}.${ext}`

  const { error: uploadError } = await admin.storage
    .from('onboarding')
    .upload(path, file, { upsert: true, contentType: file.type || undefined })

  if (uploadError) return { error: uploadError.message, url: null }

  const { data: { publicUrl } } = admin.storage
    .from('onboarding')
    .getPublicUrl(path)

  return { error: null, url: publicUrl }
}
