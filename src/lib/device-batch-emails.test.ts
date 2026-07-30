import { describe, expect, it } from 'vitest'
import { getDeviceBatch } from './device-batches'
import {
  buildBatchMajorUpdateEmail,
  buildDeviceOrderStatusEmail,
  buildDistributionStageEmail,
} from './device-batch-emails'

const batch = getDeviceBatch('cairo-batch-01')!

describe('device Batch transactional emails', () => {
  it('escapes authored update content before rendering HTML', () => {
    const email = buildBatchMajorUpdateEmail(batch, {
      date: 'Jul 30',
      title: '<Signal>',
      body: '<script>alert(1)</script>',
    })
    expect(email.html).toContain('&lt;script&gt;')
    expect(email.html).not.toContain('<script>alert')
  })

  it('describes distribution and purchase status changes', () => {
    const stage = buildDistributionStageEmail(batch, {
      id: 'field-kit',
      label: 'Field kit',
      status: 'current',
      summary: 'Packing now.',
      window: 'Aug 18–24',
    })
    const order = buildDeviceOrderStatusEmail({
      batch,
      status: 'shipped',
      packCount: 3,
      trackingNumber: 'TRACK-01',
      trackingUrl: 'https://carrier.example/track/01',
    })

    expect(stage.subject).toContain('in progress')
    expect(order.html).toContain('TRACK-01')
    expect(order.text).toContain('https://carrier.example/track/01')
  })

  it('uses the captured order amount in payment confirmation', () => {
    const email = buildDeviceOrderStatusEmail({
      batch,
      status: 'paid',
      packCount: 3,
      paidAmount: 36_000,
      currency: 'usd',
    })

    expect(email.html).toContain('$360.00')
    expect(email.text).toContain('$360.00')
    expect(email.text).toContain('3 packs')
  })

  it('rejects non-http tracking links from email CTAs', () => {
    const email = buildDeviceOrderStatusEmail({
      batch,
      status: 'shipped',
      packCount: 3,
      trackingUrl: 'javascript:alert(1)',
    })
    expect(email.html).not.toContain('javascript:')
    expect(email.text).not.toContain('javascript:')
  })
})
