import { INITIATION_AMOUNT, INITIATION_PRODUCT, INITIATION_UPGRADE_AMOUNT, type InitiationOrderKind } from './initiation-types'

export interface InitiationPaymentEvidence {
  status: string | null
  paymentStatus: string
  mode: string | null
  amount: number | null
  currency: string | null
  livemode: boolean
  orderKind: string | undefined
  productType: string | undefined
  userId: string | undefined
  orderId: string | undefined
  sessionId: string
  priceId: string | null
  productId: string | null
  quantity: number | null
  lineCount: number
}
export function validateInitiationPayment(e: InitiationPaymentEvidence, order: {
  stripe_livemode: boolean; order_kind: InitiationOrderKind; amount: number; currency: string; id: string; user_id: string; stripe_session_id: string | null; price_id: string; product_id: string
}): boolean {
  return e.livemode === order.stripe_livemode && e.status === 'complete' && e.paymentStatus === 'paid' && e.mode === 'payment'
    && e.orderKind === order.order_kind && (order.order_kind === 'standard' || order.order_kind === 'legacy_upgrade')
    && order.amount === (order.order_kind === 'legacy_upgrade' ? INITIATION_UPGRADE_AMOUNT : INITIATION_AMOUNT)
    && e.amount === order.amount && e.currency === 'usd' && order.currency === 'usd'
    && e.productType === INITIATION_PRODUCT && e.userId === order.user_id && e.orderId === order.id
    && (!order.stripe_session_id || order.stripe_session_id === e.sessionId)
    && e.lineCount === 1 && e.quantity === 1 && e.priceId === order.price_id && e.productId === order.product_id
}


/** Accept only Stripe-collected shipping details, never client-supplied/billing fallback. */
export function verifiedInitiationShipping(raw: unknown): { name: string; address: { line1: string; line2: string | null; city: string | null; state: string | null; postal_code: string | null; country: string } } | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  if (!value.address || typeof value.address !== 'object') return null
  const address = value.address as Record<string, unknown>
  const string = (field: unknown) => typeof field === 'string' ? field.trim() : ''
  const name = string(value.name), line1 = string(address.line1), country = string(address.country)
  if (!name || !line1 || !/^[A-Z]{2}$/.test(country)) return null
  return { name, address: { line1, country, line2: string(address.line2) || null, city: string(address.city) || null, state: string(address.state) || null, postal_code: string(address.postal_code) || null } }
}
