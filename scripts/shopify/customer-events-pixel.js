/* global analytics */
// Shopify Settings > Customer events. No SDK, keys, customer fields or payment URLs.
async function putopiaCheckoutStage(event) {
  const attributes = event.data?.checkout?.attributes
  const reference = attributes?.find(item => item.key === '_putopia_live_reservation')?.value
  if (!reference) return
  const payload = JSON.stringify({ reference, event: event.name, timestamp: event.timestamp })
  const send = () => fetch('https://www.multiverseco.org/api/shopify/customer-events', {
    method: 'POST', headers: { 'Content-Type': 'text/plain' }, credentials: 'omit', keepalive: true, body: payload,
  })
  try {
    const result = await send()
    if (result.status >= 500) await send()
  } catch {
    try { await send() } catch { /* The buyer's checkout continues if tracking is blocked. */ }
  }
}

analytics.subscribe('checkout_started', putopiaCheckoutStage)
analytics.subscribe('checkout_contact_info_submitted', putopiaCheckoutStage)
analytics.subscribe('checkout_address_info_submitted', putopiaCheckoutStage)
analytics.subscribe('checkout_shipping_info_submitted', putopiaCheckoutStage)
analytics.subscribe('payment_info_submitted', putopiaCheckoutStage)
analytics.subscribe('checkout_completed', putopiaCheckoutStage)
