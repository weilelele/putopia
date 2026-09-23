'use server'

import { randomUUID } from 'node:crypto'
import { EMPTY_DEVICE_UPDATE } from '@/lib/device-batch-content'
import { getPublishedDeviceUpdates } from '@/lib/device-batch-records'
import { leadFromProfile } from '@/lib/device-lead'
import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  createBatchConfigDraft,
  validateBatchConfigDraft,
} from '@/lib/device-batch-config-drafts'
import {
  createDeviceBatchFromSeed,
  normalizeLocalBatchSeed,
  validateLocalBatchSeed,
  type LocalBatchSeed,
} from '@/lib/device-batch-seed'
import { deriveDistributionStages, type DeviceBatch } from '@/lib/device-batches'
import type {
  AdminDeviceBatchRecord,
} from '@/lib/device-batch-repository'

type SaveBatchResult = {
  error: string | null
  record?: AdminDeviceBatchRecord
}

async function requireArchitect() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return profile?.role === 'architect' ? user : null
}

function validateBatch(batch: DeviceBatch) {
  if (
    !batch.slug ||
    !batch.code.trim() ||
    !batch.name.trim() ||
    !batch.location.trim() ||
    !batch.image.trim()
  ) {
    return 'Batch identity and primary image are required.'
  }
  if (JSON.stringify(batch).length > 1_000_000) {
    return 'Batch content is too large.'
  }
  return validateBatchConfigDraft(createBatchConfigDraft(batch))[0] ?? null
}

function revalidateBatchPaths(slug: string) {
  revalidatePath('/devices')
  revalidatePath(`/devices/batches/${slug}`)
  revalidatePath(`/devices/batches/${slug}/discussion`)
  revalidatePath('/devices/my-consoles')
  revalidatePath('/admin/device-batches')
}

export async function saveDeviceBatchRecord(input: {
  batch: DeviceBatch
  expectedRevision: number
  publish: boolean
}): Promise<SaveBatchResult> {
  const user = await requireArchitect()
  if (!user) return { error: 'Forbidden' }

  const validationError = validateBatch(input.batch)
  if (validationError) return { error: validationError }

  let batch = { ...input.batch, distributionStages: deriveDistributionStages(input.batch.status, input.batch.distributionStages) }
  delete (batch as DeviceBatch & { preparationPhase?: unknown }).preparationPhase
  if (batch.lead.profileId) {
    const client = await createClient()
    const { data: lead } = await client.from('voyager_profiles')
      .select('id, display_name, role, avatar_url, location, bio')
      .eq('id', batch.lead.profileId).in('role', ['architect', 'voyager']).maybeSingle()
    if (!lead) return { error: 'Choose an available Architect or Voyager as Field Lead.' }
    batch = { ...batch, lead: { ...leadFromProfile(lead), latestNote: batch.lead.latestNote } }
  }
  batch = { ...batch, updates: batch.updates ?? [], latestUpdate: batch.updates?.[0] ?? { ...EMPTY_DEVICE_UPDATE } }
  const inventory = batch.inventory ?? {
    claimedQuantity: 0,
    listingQuantity: 0,
  }
  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: readError } = await (admin.from('device_batches') as any)
    .select('id, revision, publication_status, claimed_quantity, reserved_quantity, content')
    .eq('slug', batch.slug)
    .maybeSingle()
  if (readError) return { error: readError.message }

  const now = new Date().toISOString()
  delete batch.heroCaption
  batch = { ...batch, updatedAt: input.publish ? now : existing?.content?.updatedAt ?? now }
  const publicationStatus = input.publish
    ? 'published'
    : existing?.publication_status ?? 'draft'
  const baseValues = {
    slug: batch.slug,
    code: batch.code.trim().toUpperCase(),
    name: batch.name.trim(),
    publication_status: publicationStatus,
    content: batch,
    has_unpublished_changes: !input.publish,
    updated_by: user.id,
    updated_at: now,
    ...(input.publish
      ? {
          device_status: batch.status,
          listing_quantity: inventory.listingQuantity,
          price_amount: batch.claimPrice?.amount ?? null,
          price_currency:
            batch.claimPrice?.currency.trim().toUpperCase() ?? null,
          published_content: batch,
          published_at: now,
        }
      : {}),
  }

  let saved
  if (existing) {
    if (existing.revision !== input.expectedRevision) {
      return {
        error: 'This Batch changed in another session. Reload before saving again.',
      }
    }
    if (
      inventory.listingQuantity
      < existing.claimed_quantity + existing.reserved_quantity
    ) {
      return {
        error: 'Listing quantity cannot be lower than claimed and reserved units.',
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin.from('device_batches') as any)
      .update({
        ...baseValues,
        revision: existing.revision + 1,
      })
      .eq('id', existing.id)
      .eq('revision', existing.revision)
      .select(
        'content, published_content, has_unpublished_changes, publication_status, revision, listing_quantity, claimed_quantity, reserved_quantity, price_amount, price_currency',
      )
      .maybeSingle()
    if (error) return { error: error.message }
    if (!data) return { error: 'Batch revision conflict. Reload and try again.' }
    saved = data
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin.from('device_batches') as any)
      .insert({
        ...baseValues,
        claimed_quantity: input.publish ? inventory.claimedQuantity : 0,
        listing_quantity: input.publish ? inventory.listingQuantity : 0,
        reserved_quantity: 0,
        device_status: input.publish ? batch.status : 'searching',
        price_amount: input.publish ? batch.claimPrice?.amount ?? null : null,
        price_currency: input.publish
          ? batch.claimPrice?.currency.trim().toUpperCase() ?? null
          : null,
        revision: 1,
        created_by: user.id,
      })
      .select(
        'id, content, published_content, has_unpublished_changes, publication_status, revision, listing_quantity, claimed_quantity, reserved_quantity, price_amount, price_currency',
      )
      .single()
    if (error) return { error: error.message }
    saved = data
  }

  const batchId = existing?.id ?? saved.id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: versionError } = await (admin.from('device_batch_versions') as any)
    .insert({
      batch_id: batchId,
      revision: saved.revision,
      publication_status: saved.publication_status,
      content: saved.content,
      changed_by: user.id,
    })
  if (versionError) return { error: versionError.message }

  revalidateBatchPaths(batch.slug)
  return {
    error: null,
    record: {
      batch: {
        ...(saved.content as DeviceBatch),
        inventory: {
          claimedQuantity: saved.claimed_quantity,
          listingQuantity:
            (saved.content as DeviceBatch).inventory?.listingQuantity
            ?? saved.listing_quantity,
        },
      },
      publishedUpdates: getPublishedDeviceUpdates(saved),
      hasUnpublishedChanges: saved.has_unpublished_changes,
      publicationStatus: saved.publication_status,
      revision: saved.revision,
      persisted: true,
      reservedQuantity: saved.reserved_quantity,
    },
  }
}

export async function createDeviceBatchDraft(
  seed: LocalBatchSeed,
): Promise<{ error: string | null; slug?: string }> {
  const user = await requireArchitect()
  if (!user) return { error: 'Forbidden' }

  if (!seed.leadProfileId) return { error: 'Choose a Field Lead member.' }
  const normalized = normalizeLocalBatchSeed(seed)
  const [validationError] = validateLocalBatchSeed(normalized)
  if (validationError) return { error: validationError }

  const batch = createDeviceBatchFromSeed(normalized)
  const result = await saveDeviceBatchRecord({
    batch,
    expectedRevision: 0,
    publish: false,
  })
  return result.error
    ? { error: result.error }
    : { error: null, slug: normalized.slug }
}

/** Sign a unique path; the browser sends media directly to Storage. */
export async function createDeviceMediaUpload(input: { type: string; size: number }) {
  const user = await requireArchitect()
  if (!user) return { error: 'Forbidden' }
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'video/mp4': 'mp4', 'video/webm': 'webm',
  }
  const extension = extensions[input.type]
  if (!extension || !Number.isFinite(input.size) || input.size <= 0 || input.size > 50 * 1024 * 1024) {
    return { error: 'Choose a JPEG, PNG, WebP, MP4 or WebM file up to 50 MB.' }
  }
  const storage = createAdminClient().storage.from('device-update-media')
  const path = `${user.id}/${randomUUID()}.${extension}`
  const { data, error } = await storage.createSignedUploadUrl(path)
  if (error || !data) return { error: 'Media upload is unavailable. Check the device media storage setup or add an existing URL.' }
  return { error: null, upload: { path, token: data.token, url: `/api/device-media/${path}` } }
}
