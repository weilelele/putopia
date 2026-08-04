'use server'

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
} from '@/lib/local-device-batches'
import type { DeviceBatch } from '@/lib/device-batches'
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

  const batch = input.batch
  const inventory = batch.inventory ?? {
    claimedQuantity: 0,
    listingQuantity: 0,
  }
  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: readError } = await (admin.from('device_batches') as any)
    .select('id, revision, publication_status, claimed_quantity, reserved_quantity')
    .eq('slug', batch.slug)
    .maybeSingle()
  if (readError) return { error: readError.message }

  const now = new Date().toISOString()
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
        'content, has_unpublished_changes, publication_status, revision, listing_quantity, claimed_quantity, reserved_quantity, price_amount, price_currency',
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
        device_status: input.publish ? batch.status : 'survey',
        price_amount: input.publish ? batch.claimPrice?.amount ?? null : null,
        price_currency: input.publish
          ? batch.claimPrice?.currency.trim().toUpperCase() ?? null
          : null,
        revision: 1,
        created_by: user.id,
      })
      .select(
        'id, content, has_unpublished_changes, publication_status, revision, listing_quantity, claimed_quantity, reserved_quantity, price_amount, price_currency',
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
