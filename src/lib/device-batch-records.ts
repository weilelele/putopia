import type { DeviceBatch } from '@/lib/device-batches'

export type BatchPublicationStatus = 'draft' | 'published' | 'archived'

export type AdminDeviceBatchRecord = {
  batch: DeviceBatch
  hasUnpublishedChanges: boolean
  publicationStatus: BatchPublicationStatus
  revision: number
  persisted: boolean
  reservedQuantity: number
}

export type DeviceBatchRow = {
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

export function rowToBatch(row: DeviceBatchRow, published = false): DeviceBatch | null {
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

export function publishedRowsToBatches(rows: DeviceBatchRow[]) {
  return rows
    .filter((row) => row.publication_status === 'published')
    .map((row) => rowToBatch(row, true))
    .filter((batch): batch is DeviceBatch => batch !== null)
}
