import { describe, expect, it } from 'vitest'
import {
  createDeviceBatchFromSeed,
  normalizeLocalBatchSeed,
  parseLocalBatchSeeds,
  toBatchSlug,
  validateLocalBatchSeed,
  type LocalBatchSeed,
} from './local-device-batches'

const seed: LocalBatchSeed = {
  code: 'lisbon-echo-03',
  leadName: 'Iris Vale',
  location: 'Lisbon, Portugal',
  name: 'Lisbon Echo Array',
  slug: 'lisbon-echo-03',
  summary: 'A small receiver group is being documented near the river archive.',
  updatedAt: 'Jul 30, 2026',
}

describe('local device batches', () => {
  it('creates URL-safe slugs', () => {
    expect(toBatchSlug(' Lisbon Echo 03 ')).toBe('lisbon-echo-03')
  })

  it('normalizes and validates a new Batch identity', () => {
    expect(validateLocalBatchSeed(seed)).toEqual([])
    expect(normalizeLocalBatchSeed(seed).code).toBe('LISBON-ECHO-03')
    expect(validateLocalBatchSeed({ ...seed, slug: 'Invalid Slug' })).toContain(
      'Slug must use at least three lowercase letters, numbers, or hyphens.',
    )
  })

  it('parses only complete saved seeds', () => {
    expect(
      parseLocalBatchSeeds(
        JSON.stringify({
          [seed.slug]: seed,
          invalid: { name: 'Missing fields' },
        }),
      ),
    ).toEqual({ [seed.slug]: seed })
  })

  it('turns a seed into an editable survey Batch', () => {
    const batch = createDeviceBatchFromSeed(seed)

    expect(batch.status).toBe('survey')
    expect(batch.distributionStages).toHaveLength(1)
    expect(batch.distributionStages[0].contents).toEqual(['Multiverse Console'])
    expect(batch.lead.initials).toBe('IV')
  })
})
