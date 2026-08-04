import { describe, expect, it } from 'vitest'
import {
  EMPTY_FOLLOWED_BATCHES_SNAPSHOT,
  parseFollowedBatchSlugs,
} from './device-batch-follows'

describe('parseFollowedBatchSlugs', () => {
  it('returns an empty list for an empty snapshot', () => {
    expect(parseFollowedBatchSlugs(EMPTY_FOLLOWED_BATCHES_SNAPSHOT)).toEqual([])
  })

  it('keeps unique string slugs only', () => {
    expect(
      parseFollowedBatchSlugs(
        JSON.stringify(['cairo-batch-01', 42, '', 'cairo-batch-01', 'berlin-origin-01']),
      ),
    ).toEqual(['cairo-batch-01', 'berlin-origin-01'])
  })

  it('recovers from invalid stored data', () => {
    expect(parseFollowedBatchSlugs('{invalid')).toEqual([])
    expect(parseFollowedBatchSlugs(JSON.stringify({ slug: 'cairo-batch-01' }))).toEqual([])
  })
})
