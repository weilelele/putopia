'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type {
  OnboardingVariantRow,
  OnboardingVariantInsert,
  OnboardingVariantUpdate,
} from '@/types/database'

const ONBOARDING_VARIANTS_TAG = 'onboarding-variants'

function revalidate() {
  revalidatePath('/new')
  revalidatePath('/admin/onboarding-preview')
  // Drop the cached variant copy immediately so admin edits show on the next
  // ad click rather than waiting out the time window. Two-arg form: the bare
  // revalidateTag(tag) is deprecated in this Next.js version.
  revalidateTag(ONBOARDING_VARIANTS_TAG, 'max')
}

// The /new ad landing page reads this on every (dynamic) request. Cache it so a
// Meta-ad traffic spike doesn't hit the DB per click — the prior uncached call
// on a cold serverless start was the white-screen cause. 30 s window + tag-based
// invalidation above keeps admin edits prompt.
const getOnboardingVariantsCached = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const { data } = await admin
      .from('onboarding_variants')
      .select('*')
      .order('sort_order', { ascending: true })
    return (data ?? []) as unknown as OnboardingVariantRow[]
  },
  ['onboarding-variants'],
  { revalidate: 30, tags: [ONBOARDING_VARIANTS_TAG] },
)

export async function getOnboardingVariants(): Promise<OnboardingVariantRow[]> {
  return getOnboardingVariantsCached()
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

/**
 * Mint a short-lived signed upload URL for a video in the `onboarding` bucket.
 *
 * The browser then PUTs the file straight to Supabase Storage
 * (`uploadToSignedUrl`), bypassing the Next.js server-action / Vercel
 * request-body cap (~4.5 MB on Vercel) that previously made larger videos fail.
 * The signed token carries its own auth, so the upload itself doesn't depend on
 * the caller's storage RLS — page access is already gated in /admin.
 * Bucket-level limits (50 MB, video MIME) still apply, so oversized/wrong files
 * are rejected by Storage with a clear error.
 */
export async function createOnboardingVideoUploadUrl(ext: string) {
  const admin = createAdminClient()

  const safeExt = (ext || '').replace(/[^a-z0-9]/gi, '').slice(0, 5).toLowerCase() || 'mp4'
  const path = `${Date.now()}.${safeExt}`

  const { data, error } = await admin.storage
    .from('onboarding')
    .createSignedUploadUrl(path)

  if (error || !data) {
    return { error: error?.message ?? '创建上传地址失败', path: null, token: null, publicUrl: null }
  }

  const { data: { publicUrl } } = admin.storage.from('onboarding').getPublicUrl(data.path)

  return { error: null, path: data.path, token: data.token, publicUrl }
}
