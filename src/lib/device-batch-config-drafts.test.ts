import { describe, expect, it } from 'vitest'
import {
  createBatchConfigDraft,
  normalizeBatchConfigDraft,
  parseBatchConfigDrafts,
  validateBatchConfigDraft,
} from './device-batch-config-drafts'
import { getDeviceBatch } from './__fixtures__/device-batches'

describe('batch configuration drafts', () => {
  it('copies configurable data without retaining nested array references', () => {
    const batch = getDeviceBatch('cairo-batch-01')!
    const draft = createBatchConfigDraft(batch)

    expect(draft.status).toBe('claim_open')
    expect(draft.timeZone).toBe('Africa/Cairo')
    expect(draft.distributionStages).toHaveLength(3)
    expect(draft.distributionStages).not.toBe(batch.distributionStages)
    expect(draft.distributionStages[0].contents).not.toBe(
      batch.distributionStages[0].contents,
    )
  })

  it('parses valid drafts and rejects invalid stage data', () => {
    const batch = getDeviceBatch('cairo-batch-01')!
    const draft = createBatchConfigDraft(batch)
    expect(
      parseBatchConfigDrafts(JSON.stringify({ [batch.slug]: draft }))[batch.slug]?.status,
    ).toBe('claim_open')

    expect(
      parseBatchConfigDrafts(
        JSON.stringify({
          invalid: { ...draft, distributionStages: [{ id: 'missing-fields' }] },
        }),
      ),
    ).toEqual({})
  })

  it('recovers from malformed storage data', () => {
    expect(parseBatchConfigDrafts('{invalid')).toEqual({})
  })

  it('validates claim pricing and distribution stages before saving', () => {
    const batch = getDeviceBatch('cairo-batch-01')!
    const draft = createBatchConfigDraft(batch)

    expect(validateBatchConfigDraft(draft)).toEqual([])
    expect(
      validateBatchConfigDraft({
        ...draft,
        claimPrice: undefined,
        distributionStages: [],
        nextMilestone: '',
      }),
    ).toEqual([
      'Overview fields are required.',
      'A claim-open Batch requires a price.',
      'Every Batch needs at least one complete Pack with contents.',
    ])
  })

  it('requires valid listing inventory while claims are open', () => {
    const batch = getDeviceBatch('cairo-batch-01')!
    const draft = createBatchConfigDraft(batch)

    expect(draft.inventory).toEqual({
      claimedQuantity: 42,
      listingQuantity: 64,
    })
    expect(
      validateBatchConfigDraft({
        ...draft,
        inventory: {
          claimedQuantity: 65,
          listingQuantity: 64,
        },
      }),
    ).toContain('Claimed units must stay between zero and the listing quantity.')
    expect(validateBatchConfigDraft({ ...draft, inventory: undefined })).toContain(
      'A claim-open Batch requires listing inventory.',
    )
    expect(
      validateBatchConfigDraft({
        ...draft,
        inventory: { claimedQuantity: 0, listingQuantity: 0 },
      }),
    ).toContain('A claim-open Batch requires at least one listed unit.')
  })

  it('allows zero inventory before claims open', () => {
    const batch = getDeviceBatch('cairo-batch-01')!
    const draft = createBatchConfigDraft(batch)

    expect(
      validateBatchConfigDraft({
        ...draft,
        claimPrice: undefined,
        inventory: { claimedQuantity: 0, listingQuantity: 0 },
        status: 'survey',
      }),
    ).toEqual([])
  })

  it('requires a valid IANA time zone', () => {
    const batch = getDeviceBatch('cairo-batch-01')!
    const draft = createBatchConfigDraft(batch)

    expect(validateBatchConfigDraft({ ...draft, timeZone: 'Cairo time' })).toContain(
      'Use a valid time zone such as Asia/Tokyo or Europe/London.',
    )
  })

  it('normalizes text, currency, and Pack contents for a stable saved draft', () => {
    const batch = getDeviceBatch('cairo-batch-01')!
    const draft = createBatchConfigDraft(batch)
    const normalized = normalizeBatchConfigDraft({
      ...draft,
      claimPrice: {
        amount: 360,
        currency: ' usd ',
        description: '  Complete Batch claim  ',
      },
      distributionStages: [
        {
          ...draft.distributionStages[0],
          contents: [' Antenna fragment ', '  '],
          label: ' First signal pack ',
        },
      ],
      timeZone: ' Africa/Cairo ',
    })

    expect(normalized.claimPrice).toEqual({
      amount: 360,
      currency: 'USD',
      description: 'Complete Batch claim',
    })
    expect(normalized.distributionStages[0].label).toBe('First signal pack')
    expect(normalized.distributionStages[0].contents).toEqual(['Antenna fragment'])
    expect(normalized.timeZone).toBe('Africa/Cairo')
  })
})
