import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import type { DeviceBatch } from '@/lib/device-batches'

import { publishedRowsToBatches, rowToBatch, type DeviceBatchRow, type AdminDeviceBatchRecord } from '@/lib/device-batch-records'
export type { BatchPublicationStatus, AdminDeviceBatchRecord } from '@/lib/device-batch-records'

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
    // Only persistent published snapshots are authoritative; never show mocks.
    const batches = publishedRowsToBatches((data ?? []) as DeviceBatchRow[])
    return attachLiveHolderDirectory(admin, batches)
  } catch (error) {
    console.error('[device-batches] published registry unavailable:', error)
    throw new Error('The Device Library is temporarily unavailable. Please try again.')
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

    return [...persisted.values()]
  } catch (error) {
    console.error('[device-batches] admin registry unavailable:', error)
    throw new Error('The Device Library is temporarily unavailable. Please try again.')
  }
}

export async function getAdminDeviceBatch(slug: string) {
  const records = await listAdminDeviceBatchRecords()
  return records.find((record) => record.batch.slug === slug)?.batch
}
