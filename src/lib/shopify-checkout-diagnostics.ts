import { shopifyCheckoutStages } from './shopify-customer-events'

export const shopifyDiagnosticEvents = {
  clicked: 'initiation_checkout_clicked',
  form_submitted: 'initiation_checkout_form_submitted',
  input_focused: 'initiation_checkout_input_focused',
  input_changed: 'initiation_checkout_input_changed',
  input_blurred: 'initiation_checkout_input_blurred',
  alert_displayed: 'initiation_checkout_alert_displayed',
  ui_extension_errored: 'initiation_checkout_extension_errored',
} as const

const fields = ['contact', 'address', 'shipping', 'payment', 'discount', 'checkout', 'other'] as const
const controls = ['pay_button', 'submit_button', 'express_checkout', 'field', 'other'] as const
const alerts = ['CHECKOUT_ERROR', 'CONTACT_ERROR', 'DELIVERY_ERROR', 'DISCOUNT_ERROR', 'INPUT_INVALID', 'INPUT_REQUIRED',
  'INVENTORY_ERROR', 'MERCHANDISE_ERROR', 'PAYMENT_ERROR', 'UNKNOWN'] as const
export const transactionErrors = ['AMAZON_PAYMENTS_INVALID_PAYMENT_METHOD', 'AMAZON_PAYMENTS_MAX_AMOUNT_CHARGED',
  'AMAZON_PAYMENTS_MAX_AMOUNT_REFUNDED', 'AMAZON_PAYMENTS_MAX_AUTHORIZATIONS_CAPTURED', 'AMAZON_PAYMENTS_MAX_REFUNDS_PROCESSED',
  'AMAZON_PAYMENTS_ORDER_REFERENCE_CANCELED', 'AMAZON_PAYMENTS_STALE', 'AMOUNT_TOO_LARGE', 'AMOUNT_TOO_SMALL',
  'AUTHENTICATION_FAILED', 'AUTHENTICATION_REQUIRED', 'AUTHORIZATION_EXPIRED', 'CALL_ISSUER', 'CANCELLED_PAYMENT',
  'CARD_DECLINED', 'CARD_TESTING', 'CONFIG_ERROR', 'DO_NOT_HONOR', 'EXPIRED_CARD', 'FRAUD_SUSPECTED', 'GENERIC_ERROR',
  'INCORRECT_ADDRESS', 'INCORRECT_CVC', 'INCORRECT_NUMBER', 'INCORRECT_PIN', 'INCORRECT_ZIP', 'INSTRUMENT_DECLINED',
  'INSUFFICIENT_FUNDS', 'INVALID_AMOUNT', 'INVALID_COUNTRY', 'INVALID_CURRENCY', 'INVALID_CVC', 'INVALID_EXPIRY_DATE',
  'INVALID_NUMBER', 'INVALID_PAYMENT_METHOD', 'INVALID_PURCHASE_TYPE', 'MERCHANT_ACCOUNT_ERROR', 'MERCHANT_RULE',
  'PAYMENT_METHOD_UNAVAILABLE', 'PAYMENT_METHOD_UNSUPPORTED', 'PAYMENT_PROVIDER_ERROR', 'PICK_UP_CARD', 'PROCESSING_ERROR',
  'RETRY_DECLINED', 'TEST_MODE_LIVE_CARD', 'TRANSACTION_LIMIT_EXCEEDED', 'UNSUPPORTED_FEATURE', 'NONE', 'UNKNOWN'] as const

export type ShopifyDiagnosticName = typeof shopifyDiagnosticEvents[keyof typeof shopifyDiagnosticEvents]
  | 'initiation_checkout_stage_observed' | 'initiation_checkout_transaction_observed'
export type ShopifyDiagnosticProperties = Partial<{
  field_category: typeof fields[number]
  control: typeof controls[number]
  alert_type: typeof alerts[number]
  extension_error_type: 'EXTENSION_USAGE_ERROR' | 'UNKNOWN'
  stage: keyof typeof shopifyCheckoutStages
  shopify_seq: number
  transaction_kind: 'AUTHORIZATION' | 'CAPTURE' | 'SALE' | 'VOID' | 'REFUND'
  transaction_status: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'ERROR' | 'AWAITING_RESPONSE' | 'UNKNOWN'
  transaction_error_code: typeof transactionErrors[number]
  transaction_time_source: 'processed_at' | 'created_at'
}>

function member<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === 'string' && (values as readonly string[]).includes(value) ? value as T : fallback
}

/** Defense in depth: re-project saved payloads before delivery. Never send raw DOM, messages or values. */
export function diagnosticProperties(event: ShopifyDiagnosticName, value: unknown): ShopifyDiagnosticProperties {
  const p = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  if (event === 'initiation_checkout_transaction_observed') return {
    transaction_kind: member(p.transaction_kind, ['AUTHORIZATION', 'CAPTURE', 'SALE', 'VOID', 'REFUND'] as const, 'AUTHORIZATION'),
    transaction_status: member(p.transaction_status, ['SUCCESS', 'FAILURE', 'PENDING', 'ERROR', 'AWAITING_RESPONSE', 'UNKNOWN'] as const, 'UNKNOWN'),
    transaction_error_code: member(p.transaction_error_code, transactionErrors, 'UNKNOWN'),
    transaction_time_source: member(p.transaction_time_source, ['processed_at', 'created_at'] as const, 'created_at'),
  }
  const result: ShopifyDiagnosticProperties = {}
  if (Number.isSafeInteger(p.shopify_seq) && Number(p.shopify_seq) >= 0 && Number(p.shopify_seq) <= 1e9) result.shopify_seq = Number(p.shopify_seq)
  if (event === 'initiation_checkout_stage_observed') {
    if (typeof p.stage === 'string' && Object.hasOwn(shopifyCheckoutStages, p.stage)) result.stage = p.stage as keyof typeof shopifyCheckoutStages
  } else if (event === 'initiation_checkout_alert_displayed') {
    result.field_category = member(p.field_category, fields, 'other')
    result.alert_type = member(p.alert_type, alerts, 'UNKNOWN')
  } else if (event === 'initiation_checkout_extension_errored') {
    result.extension_error_type = member(p.extension_error_type, ['EXTENSION_USAGE_ERROR', 'UNKNOWN'] as const, 'UNKNOWN')
  } else {
    result.field_category = member(p.field_category, fields, 'other')
    result.control = member(p.control, controls, 'other')
  }
  return result
}

export function parseShopifyCheckoutDiagnostic(value: unknown, now: number) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  if (typeof input.reference !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.[0-9a-f]{64}$/i.test(input.reference)
    || typeof input.event !== 'string' || typeof input.event_id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(input.event_id)
    || typeof input.timestamp !== 'string') return null
  const time = Date.parse(input.timestamp)
  if (!Number.isFinite(time) || time > now + 60000 || time < now - 86400000) return null
  const stage = Object.hasOwn(shopifyCheckoutStages, input.event)
  if (!stage && !Object.hasOwn(shopifyDiagnosticEvents, input.event)) return null
  const event: ShopifyDiagnosticName = stage ? 'initiation_checkout_stage_observed'
    : shopifyDiagnosticEvents[input.event as keyof typeof shopifyDiagnosticEvents]
  const properties = diagnosticProperties(event, { ...(input.properties && typeof input.properties === 'object' ? input.properties : {}),
    ...(stage ? { stage: input.event } : {}) })
  return { reference: input.reference, orderId: input.reference.slice(0, 36), timestamp: new Date(time).toISOString(),
    event, eventId: input.event_id, properties }
}
