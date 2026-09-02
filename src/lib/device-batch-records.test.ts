import { describe, expect, it } from 'vitest'
import { getDeviceBatch } from './__fixtures__/device-batches'
import { publishedRowsToBatches, rowToBatch, type DeviceBatchRow } from './device-batch-records'
import { toDeviceLibraryEntry } from './device-library-entry'

const published = getDeviceBatch('cairo-batch-01')!
const row: DeviceBatchRow = {
  content: { ...published, name: 'Private draft', summary: 'Unapproved story' },
  published_content: published,
  publication_status: 'published',
  revision: 2,
  listing_quantity: 50,
  claimed_quantity: 3,
  reserved_quantity: 2,
  price_amount: 420,
  price_currency: 'USD',
}

describe('production-only Device Library', () => {
  it('does not restore mock batches for an empty registry', () => {
    expect(publishedRowsToBatches([])).toEqual([])
  })

  it('excludes drafts, archived records and missing published snapshots', () => {
    expect(publishedRowsToBatches([
      { ...row, publication_status: 'draft' },
      { ...row, publication_status: 'archived' },
      { ...row, published_content: null },
      { ...row, published_content: {} },
    ])).toEqual([])
  })

  it('uses the approved snapshot and live inventory, never the pending draft', () => {
    const [batch] = publishedRowsToBatches([row])
    expect(batch.name).toBe(published.name)
    expect(batch.summary).toBe(published.summary)
    expect(batch.inventory).toEqual({ claimedQuantity: 5, listingQuantity: 50 })
    expect(batch.claimPrice?.amount).toBe(420)
    expect(rowToBatch(row)?.name).toBe('Private draft')
  })

  it('sends downstream readers to the Batch page without inventing an owner', () => {
    const entry = toDeviceLibraryEntry(published)
    expect(entry.href).toBe('/devices/batches/cairo-batch-01')
    expect(entry.current_user_id).toBeNull()
    expect(entry.status).toBe('claim_open')
    expect(entry.description).toBe(published.summary)
  })
})
