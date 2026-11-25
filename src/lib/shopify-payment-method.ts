import type { ShopifyLiveOrder } from './shopify-live-order'

// Separate from the financial verifier's query: an unavailable metadata field must not stop payment.
export const SHOPIFY_PAYMENT_METHOD_QUERY = `query PutopiaPaymentMethod($id: ID!) {
  order(id: $id) { id test email updatedAt customAttributes { key value } transactions(first: 20) {
    id kind status test gateway processedAt createdAt parentTransaction { id }
    paymentDetails { __typename ... on CardPaymentDetails { wallet } }
  } }
}`

export const shopifyPaymentMethods = ['unknown', 'card', 'shop_pay', 'shop_pay_installments', 'apple_pay', 'google_pay', 'paypal', 'other_wallet', 'other'] as const
export type ShopifyPaymentMethod = typeof shopifyPaymentMethods[number]
export type ShopifyCheckoutFlow = 'standard' | 'shop_pay' | 'other_express' | 'unknown'

export function normalizeShopifyPaymentMethod(value: unknown): ShopifyPaymentMethod {
  return typeof value === 'string' && (shopifyPaymentMethods as readonly string[]).includes(value)
    ? value as ShopifyPaymentMethod : 'unknown'
}

export function shopifyCheckoutFlow(method: ShopifyPaymentMethod): ShopifyCheckoutFlow {
  if (method === 'shop_pay' || method === 'shop_pay_installments') return 'shop_pay'
  if (method === 'card') return 'standard'
  if (['apple_pay', 'google_pay', 'paypal', 'other_wallet'].includes(method)) return 'other_express'
  return 'unknown'
}

function methodFromDetails(details: ShopifyPaymentDetails | null | undefined): ShopifyPaymentMethod {
  if (!details) return 'unknown'
  if (details.__typename === 'ShopPayInstallmentsPaymentDetails') return 'shop_pay_installments'
  if (details.__typename === 'PaypalWalletPaymentDetails') return 'paypal'
  if (details.__typename !== 'CardPaymentDetails') return 'other'
  // Undefined means the field was not fetched. Only an explicit null proves a non-wallet card.
  if (details.wallet === null) return 'card'
  if (details.wallet === 'SHOPIFY_PAY') return 'shop_pay'
  if (details.wallet === 'APPLE_PAY') return 'apple_pay'
  if (details.wallet === 'GOOGLE_PAY' || details.wallet === 'ANDROID_PAY') return 'google_pay'
  return details.wallet ? 'other_wallet' : 'unknown'
}

export type ShopifyPaymentDetails = { __typename: string; wallet?: string | null }

/** Use successful settlement, then its parent authorization. Failed attempts cannot classify a buyer. */
export function shopifyOrderPaymentMethod(order: ShopifyLiveOrder): ShopifyPaymentMethod {
  if (order.test) return 'unknown'
  const successful = order.transactions.filter(tx => !tx.test && tx.gateway === 'shopify_payments'
    && tx.status === 'SUCCESS' && /^gid:\/\/shopify\/OrderTransaction\/\d+$/.test(tx.id))
  const latest = (kinds: string[]) => successful.filter(tx => kinds.includes(tx.kind))
    .sort((a, b) => Date.parse(b.processedAt ?? b.createdAt ?? '') - Date.parse(a.processedAt ?? a.createdAt ?? ''))[0]
  const settled = latest(['CAPTURE', 'SALE'])
  const tx = settled ?? latest(['AUTHORIZATION'])
  if (!tx) return 'unknown'
  const method = methodFromDetails(tx.paymentDetails)
  if (method !== 'unknown' || !settled?.parentTransaction) return method
  return methodFromDetails(successful.find(parent => parent.id === settled.parentTransaction?.id && parent.kind === 'AUTHORIZATION')?.paymentDetails)
}

export function shopifyPaymentProperties(method: unknown) {
  const payment_method = normalizeShopifyPaymentMethod(method)
  return { payment_method, checkout_flow: shopifyCheckoutFlow(payment_method),
    payment_method_evidence: payment_method === 'unknown' ? 'unobserved' as const : 'shopify_admin_transaction' as const }
}
