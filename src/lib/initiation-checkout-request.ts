import type { InitiationAnalyticsContext } from './initiation-analytics'
import { shopifyLiveCheckoutUrl } from './shopify-checkout-url'

export type InitiationCheckoutInput = {
  bundle: 'initial' | 'standard'
  from: string | null
  analytics: InitiationAnalyticsContext
  afterSignIn: boolean
}
export type InitiationCheckoutResult = { status: 'ready'; url: string } | { status: 'refresh' } | { status: 'unauthenticated' } | { status: 'error'; message: string }

export function validInitiationCheckoutUrl(raw: string) {
  const url = URL.parse(raw)
  return !!(url && url.protocol === 'https:' && url.host === 'checkout.stripe.com' && !url.username && !url.password)
    || !!shopifyLiveCheckoutUrl(raw)
}

/** One browser round trip; the API checks access before making any payment reservation. */
export async function requestInitiationCheckout(input: InitiationCheckoutInput, request: typeof fetch = fetch): Promise<InitiationCheckoutResult> {
  const response = await request('/api/initiation-checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  if (response.status === 401) return { status: 'unauthenticated' }
  const data = await response.json()
  if (response.ok && data.next === 'refresh') return { status: 'refresh' }
  if (response.ok && typeof data.url === 'string') {
    if (validInitiationCheckoutUrl(data.url)) return { status: 'ready', url: data.url }
  }
  return { status: 'error', message: typeof data.error === 'string' ? data.error : 'Checkout is unavailable. Please try again.' }
}
