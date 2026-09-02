import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import {
  DEVICE_BATCHES,
  type DeviceBatch,
} from '@/lib/device-batches'

export type BatchPublicationStatus = 'draft' | 'published' | 'archived'

export type AdminDeviceBatchRecord = {
  batch: DeviceBatch
  hasUnpublishedChanges: boolean
  publicationStatus: BatchPublicationStatus
  revision: number
  persisted: boolean
  reservedQuantity: number
}

type DeviceBatchRow = {
  content: unknown
  published_content?: unknown
  has_unpublished_changes?: boolean
  publication_status: BatchPublicationStatus
  revision: number
  listing_quantity: number
  claimed_quantity: number
  reserved_quantity: number
  price_amount: number | string | null
  price_currency: string | null
}

function rowToBatch(row: DeviceBatchRow, published = false): DeviceBatch | null {
  const source = published ? row.published_content : row.content
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return null
  }

  const content = source as DeviceBatch
  if (!content.slug || !content.code || !content.name) return null

  return {
    ...content,
    claimPrice: published && row.price_amount !== null && row.price_currency
        ? {
            amount: Number(row.price_amount),
            currency: row.price_currency,
            description: content.claimPrice?.description ?? '',
          }
        : content.claimPrice,
    inventory: published
      ? {
          claimedQuantity: row.claimed_quantity + row.reserved_quantity,
          listingQuantity: row.listing_quantity,
        }
      : {
          claimedQuantity: row.claimed_quantity,
          listingQuantity:
            content.inventory?.listingQuantity ?? row.listing_quantity,
        },
  }
}

function publishedRowsToBatches(rows: DeviceBatchRow[]) {
  return rows
    .map((row) => rowToBatch(row, true))
    .filter((batch): batch is DeviceBatch => batch !== null)
}

async function attachLiveHolderDirectory(
  admin: ReturnType<typeof createAdminClient>,
  batches: DeviceBatch[],
) {
  if (!batches.length) return batches
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from('device_batch_units') as any)
    .select('batch_slug, sequence_no, unit_code')
    .in('batch_slug', batches.map((batch) => batch.slug))
    .in('status', ['assigned', 'preparing', 'shipped', 'delivered', 'return_pending'])
    .order('sequence_no', { ascending: true })
  if (error) {
    // Published holder fixtures must never leak back into the live directory.
    console.warn('[device-batches] live holder directory unavailable:', error)
    return batches.map((batch) => ({ ...batch, holders: [] }))
  }
  const holdersByBatch = new Map<string, DeviceBatch['holders']>()
  for (const unit of data ?? []) {
    const holders = holdersByBatch.get(unit.batch_slug) ?? []
    holders.push({
      // The public directory proves that a real Unit is held without exposing
      // the buyer's account identity. Admin fulfillment retains the full link.
      name: `Holder ${String(unit.sequence_no).padStart(3, '0')}`,
      unit: unit.unit_code,
      location: 'Collective network',
    })
    holdersByBatch.set(unit.batch_slug, holders)
  }
  return batches.map((batch) => ({
    ...batch,
    holders: holdersByBatch.get(batch.slug) ?? [],
  }))
}

export async function listPublicDeviceBatches(): Promise<DeviceBatch[]> {
  try {
    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin.from('device_batches') as any)
      .select(
        'content, published_content, publication_status, revision, listing_quantity, claimed_quantity, reserved_quantity, price_amount, price_currency',
      )
      .eq('publication_status', 'published')
      .order('updated_at', { ascending: false })

    if (error) throw error
    // Once the persistent registry is reachable it is authoritative. In
    // particular, an archived Batch must not reappear from the static fallback.
    const batches = publishedRowsToBatches((data ?? []) as DeviceBatchRow[])
    return attachLiveHolderDirectory(admin, batches)
  } catch (error) {
    console.warn('[device-batches] using static registry fallback:', error)
    return DEVICE_BATCHES
  }
}

export async function getPublicDeviceBatch(slug: string) {
  const batches = await listPublicDeviceBatches()
  return batches.find((batch) => batch.slug === slug)
}

export async function listAdminDeviceBatchRecords(): Promise<AdminDeviceBatchRecord[]> {
  try {
    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin.from('device_batches') as any)
      .select(
        'content, published_content, has_unpublished_changes, publication_status, revision, listing_quantity, claimed_quantity, reserved_quantity, price_amount, price_currency',
      )
      .order('updated_at', { ascending: false })
    if (error) throw error

    const persisted = new Map<string, AdminDeviceBatchRecord>()
    for (const row of (data ?? []) as DeviceBatchRow[]) {
      const batch = rowToBatch(row)
      if (!batch) continue
      persisted.set(batch.slug, {
        batch,
        hasUnpublishedChanges: row.has_unpublished_changes ?? false,
        publicationStatus: row.publication_status,
        revision: row.revision,
        persisted: true,
        reservedQuantity: row.reserved_quantity,
      })
    }

    const staticSlugs = new Set(DEVICE_BATCHES.map((batch) => batch.slug))
    return [
      ...DEVICE_BATCHES.map(
        (batch) =>
          persisted.get(batch.slug) ?? {
            batch,
            hasUnpublishedChanges: false,
            publicationStatus: 'published' as const,
            revision: 0,
            persisted: false,
            reservedQuantity: 0,
          },
      ),
      ...[...persisted.values()].filter(
        (record) => !staticSlugs.has(record.batch.slug),
      ),
    ]
  } catch (error) {
    console.warn('[device-batches] admin registry fallback:', error)
    return DEVICE_BATCHES.map((batch) => ({
      batch,
      hasUnpublishedChanges: false,
      publicationStatus: 'published',
      revision: 0,
      persisted: false,
      reservedQuantity: 0,
    }))
  }
}

export async function getAdminDeviceBatch(slug: string) {
  const records = await listAdminDeviceBatchRecords()
  return records.find((record) => record.batch.slug === slug)?.batch
}
