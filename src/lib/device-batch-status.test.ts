import { describe, expect, it } from 'vitest'
import { DEVICE_BATCH_PHASES, canClaimDeviceBatch, deriveDistributionStages, getBatchClaimHref, readDeviceBatchStatus } from './device-batches'
import { getDeviceBatch } from './__fixtures__/device-batches'
import { getDeviceCheckoutDetailsForBatch } from './device-checkout'
import { createBatchConfigDraft, normalizeBatchConfigDraft, validateBatchConfigDraft } from './device-batch-config-drafts'

const batch = getDeviceBatch('cairo-batch-01')!
describe('one batch status controls progress and claims', () => {
  it('blocks Searching in both navigation and server checkout, including a configured price', () => {
    const searching = { ...batch, status: 'searching' as const }
    expect(getBatchClaimHref(searching)).toBeUndefined()
    expect(getDeviceCheckoutDetailsForBatch(searching)).toMatchObject({ ok: false, status: 409 })
    expect(canClaimDeviceBatch('invalid' as never)).toBe(false)
  })
  it.each(DEVICE_BATCH_PHASES.slice(1))('allows paid claims in %s but still enforces stock and price', (status) => {
    const claiming = { ...batch, status }
    expect(getDeviceCheckoutDetailsForBatch(claiming).ok).toBe(true)
    expect(getDeviceCheckoutDetailsForBatch({ ...claiming, claimPrice: undefined }).ok).toBe(false)
    expect(getDeviceCheckoutDetailsForBatch({ ...claiming, inventory: { listingQuantity: 10, claimedQuantity: 10 } }).ok).toBe(false)
    expect(validateBatchConfigDraft({ ...createBatchConfigDraft(claiming), claimPrice: undefined })).toContain('A claimable Batch requires a price.')
  })
  it('overrides stale independent pack states on forward and backward changes', () => {
    const stale = batch.distributionStages.map((stage) => ({ ...stage, status: 'completed' as const }))
    expect(deriveDistributionStages('claiming', stale).map((stage) => stage.status)).toEqual(['upcoming', 'upcoming', 'upcoming'])
    expect(deriveDistributionStages('pack_two', stale).map((stage) => stage.status)).toEqual(['completed', 'current', 'upcoming'])
    const draft = normalizeBatchConfigDraft({ ...createBatchConfigDraft(batch), status: 'console', distributionStages: stale })
    expect(draft.distributionStages.map((stage) => stage.status)).toEqual(['completed', 'completed', 'current'])
  })
  it('preserves closed legacy batches and reads old live phases safely', () => {
    expect(readDeviceBatchStatus('survey')).toBe('searching')
    expect(readDeviceBatchStatus('unknown')).toBe('searching')
    expect(readDeviceBatchStatus('claim_open')).toBe('claiming')
    expect(readDeviceBatchStatus('active')).toBe('console')
    expect(readDeviceBatchStatus('distribution', deriveDistributionStages('pack_two', batch.distributionStages))).toBe('pack_two')
  })
})
