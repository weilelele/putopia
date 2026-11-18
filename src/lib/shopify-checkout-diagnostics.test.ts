import { describe, expect, it } from 'vitest'
import { diagnosticProperties, parseShopifyCheckoutDiagnostic, shopifyDiagnosticEvents } from './shopify-checkout-diagnostics'
import { shopifyDiagnosticKey } from './shopify-checkout-diagnostics-outbox'

const now = Date.parse('2026-11-19T00:00:00Z')
const input = { reference: '82500000-0000-4000-8000-000000000001.' + 'a'.repeat(64), event: 'clicked',
  event_id: 'sh-1-opaque-event', timestamp: new Date(now).toISOString(),
  properties: { field_category: 'payment', control: 'pay_button', shopify_seq: 42 } }

describe('checkout diagnostic boundary', () => {
  it.each(Object.keys(shopifyDiagnosticEvents))('accepts %s but not arbitrary client event names', event => {
    expect(parseShopifyCheckoutDiagnostic({ ...input, event }, now)?.event).toBe(shopifyDiagnosticEvents[event as keyof typeof shopifyDiagnosticEvents])
  })
  it('retains the occurrence ID and sequence, without raw personal or DOM fields', () => {
    const result = parseShopifyCheckoutDiagnostic({ ...input, email: 'private@example.com',
      properties: { ...input.properties, value: '4111111111111111', message: 'private address', target: 'private DOM', href: 'private URL' } }, now)
    expect(result).toEqual({ reference: input.reference, orderId: input.reference.slice(0, 36),
      event: 'initiation_checkout_clicked', eventId: input.event_id, timestamp: input.timestamp, properties: input.properties })
  })
  it('keeps repeat occurrences but deduplicates network retries of the same occurrence', () => {
    const event = 'initiation_checkout_clicked'
    expect(shopifyDiagnosticKey(event, input.event_id)).toBe(shopifyDiagnosticKey(event, input.event_id))
    expect(shopifyDiagnosticKey(event, input.event_id)).not.toBe(shopifyDiagnosticKey(event, 'sh-2'))
  })
  it('preserves repeated stages separately from the existing first-stage funnel', () => {
    expect(parseShopifyCheckoutDiagnostic({ ...input, event: 'payment_info_submitted' }, now))
      .toMatchObject({ event: 'initiation_checkout_stage_observed', properties: { stage: 'payment_info_submitted', shopify_seq: 42 } })
    expect(parseShopifyCheckoutDiagnostic({ ...input, event: 'initiation_purchase_completed' }, now)).toBeNull()
    expect(parseShopifyCheckoutDiagnostic({ ...input, event: 'initiation_checkout_transaction_observed' }, now)).toBeNull()
  })
  it('only accepts fixed error and field categories, never messages or arbitrary error strings', () => {
    const result = parseShopifyCheckoutDiagnostic({ ...input, event: 'alert_displayed',
      properties: { field_category: 'private@example.com', alert_type: 'INPUT_REQUIRED', message: 'Secret', value: 'Secret' } }, now)
    expect(result?.properties).toEqual({ field_category: 'other', alert_type: 'INPUT_REQUIRED' })
    expect(diagnosticProperties('initiation_checkout_extension_errored', { extension_error_type: 'Secret', trace: 'Secret' }))
      .toEqual({ extension_error_type: 'UNKNOWN' })
  })
  it.each([{ reference: 'invalid' }, { event_id: '../private' }, { event_id: '' }, { event: 'Purchase' },
    { timestamp: 'invalid' }, { timestamp: '2026-11-19T00:02:00Z' }, { timestamp: '2026-11-17T00:00:00Z' }])
  ('rejects forged/stale/unsupported input %j', patch => expect(parseShopifyCheckoutDiagnostic({ ...input, ...patch }, now)).toBeNull())
  it('drops invalid sequence numbers and clamps unknown transaction errors to a fixed category', () => {
    expect(diagnosticProperties('initiation_checkout_clicked', { shopify_seq: -1 })).not.toHaveProperty('shopify_seq')
    expect(diagnosticProperties('initiation_checkout_transaction_observed', { transaction_error_code: 'secret payment token' }))
      .toMatchObject({ transaction_error_code: 'UNKNOWN' })
  })
})
