import { describe, expect, it } from 'vitest'
import {
  createDeviceBatchFromSeed,
  normalizeLocalBatchSeed,
  toBatchSlug,
  validateLocalBatchSeed,
  type LocalBatchSeed,
} from './device-batch-seed'

const seed: LocalBatchSeed = {
  code: 'lisbon-echo-03',
  leadName: 'Iris Vale',
  location: 'Lisbon, Portugal',
  name: 'Lisbon Echo Array',
  slug: 'lisbon-echo-03',
  summary: 'A small receiver group is being documented near the river archive.',
  timeZone: 'Europe/Lisbon',
  updatedAt: 'Jul 30, 2026',
}

describe('device batch draft seeds', () => {
  it('creates URL-safe slugs', () => {
    expect(toBatchSlug(' Lisbon Echo 03 ')).toBe('lisbon-echo-03')
  })

  it('normalizes and validates a new Batch identity', () => {
    expect(validateLocalBatchSeed(seed)).toEqual([])
    expect(normalizeLocalBatchSeed(seed).code).toBe('LISBON-ECHO-03')
    expect(normalizeLocalBatchSeed({ ...seed, timeZone: ' Europe/Lisbon ' }).timeZone)
      .toBe('Europe/Lisbon')
    expect(validateLocalBatchSeed({ ...seed, slug: 'Invalid Slug' })).toContain(
      'Slug must use at least three lowercase letters, numbers, or hyphens.',
    )
    expect(validateLocalBatchSeed({ ...seed, timeZone: 'Lisbon time' })).toContain(
      'Use a valid time zone such as Asia/Tokyo or Europe/London.',
    )
  })

  it('turns a seed into an editable survey Batch', () => {
    const batch = createDeviceBatchFromSeed(seed)

    expect(batch.status).toBe('survey')
    expect(batch.distributionStages).toHaveLength(1)
    expect(batch.distributionStages[0].contents).toEqual(['Multiverse Console'])
    expect(batch.lead.initials).toBe('IV')
    expect(batch.timeZone).toBe('Europe/Lisbon')
  })
})
