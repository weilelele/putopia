import { describe, expect, it } from 'vitest'
import release from '../../docs/releases/kyoto-one/batch.json'
import type { DeviceBatch } from './device-batches'
import { createBatchConfigDraft, validateBatchConfigDraft } from './device-batch-config-drafts'
import { getDeviceCheckoutDetailsForBatch } from './device-checkout'

describe('Kyoto One release contract', () => {
  const batch = release as DeviceBatch

  it('passes the admin publish gate and charges the full preorder price', () => {
    expect(validateBatchConfigDraft(createBatchConfigDraft(batch))).toEqual([])
    const checkout = getDeviceCheckoutDetailsForBatch(batch)
    expect(checkout.ok).toBe(true)
    if (checkout.ok) {
      expect(checkout.details.amount).toBe(52000)
      expect(checkout.details.currency).toBe('usd')
    }
  })

  it('closes checkout when all 50 assigned units are claimed', () => {
    expect(getDeviceCheckoutDetailsForBatch({
      ...batch,
      inventory: { listingQuantity: 50, claimedQuantity: 50 },
    })).toMatchObject({ ok: false, status: 409 })
    expect(batch.distributionStages.map((stage) => stage.id)).toEqual([
      'initial-voyager-pack', 'components-pack', 'console',
    ])
    expect(batch.distributionStages.every((stage) => stage.status === 'upcoming')).toBe(true)
  })
})
