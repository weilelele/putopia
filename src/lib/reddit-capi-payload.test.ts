import { describe, expect, it } from 'vitest'
import {
  appendRedditClickId,
  buildRedditCapiPayload,
  normalizeRedditClickId,
} from './reddit-capi-payload'

describe('Reddit CAPI payload', () => {
  it('uses Reddit v3 event names and conversion ID deduplication', () => {
    const payload = buildRedditCapiPayload({
      trackingType: 'LEAD',
      conversionId: 'conversion-123',
      eventAt: 1_754_416_800_000,
      eventSourceUrl: 'https://multiverseco.org/new',
      clickId: '3184742045291813272',
      email: 'hashed-email',
      ipAddress: '192.0.2.1',
      userAgent: 'test-agent',
      uuid: '1684189007728.uuid',
      testId: 'test-123',
    })

    expect(payload).toEqual({
      data: {
        test_id: 'test-123',
        events: [{
          event_at: 1_754_416_800_000,
          action_source: 'WEBSITE',
          type: { tracking_type: 'LEAD' },
          metadata: { conversion_id: 'conversion-123' },
          click_id: '3184742045291813272',
          event_source_url: 'https://multiverseco.org/new?rdt_cid=3184742045291813272',
          user: {
            email: 'hashed-email',
            ip_address: '192.0.2.1',
            user_agent: 'test-agent',
            uuid: '1684189007728.uuid',
          },
        }],
      },
    })
  })

  it('omits empty optional fields', () => {
    const payload = buildRedditCapiPayload({
      trackingType: 'SIGN_UP',
      conversionId: 'conversion-456',
      eventAt: 123,
    })

    expect(payload).toEqual({
      data: {
        events: [{
          event_at: 123,
          action_source: 'WEBSITE',
          type: { tracking_type: 'SIGN_UP' },
          metadata: { conversion_id: 'conversion-456' },
        }],
      },
    })
  })

  it('preserves an existing click ID in the event URL', () => {
    expect(appendRedditClickId(
      'https://multiverseco.org/new?rdt_cid=existing',
      'new-click',
    )).toBe('https://multiverseco.org/new?rdt_cid=existing')
  })

  it('rejects unsafe or oversized click IDs', () => {
    expect(normalizeRedditClickId('contains spaces')).toBeUndefined()
    expect(normalizeRedditClickId('x'.repeat(256))).toBeUndefined()
  })
})
