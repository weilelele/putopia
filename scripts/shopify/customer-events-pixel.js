/* global analytics */
// Custom Pixel v3. Fixed categories only: never input values, text, URLs or error messages.
const putopiaStages = new Set(['checkout_started', 'checkout_contact_info_submitted', 'checkout_address_info_submitted',
  'checkout_shipping_info_submitted', 'payment_info_submitted', 'checkout_completed'])
const putopiaAlertTypes = new Set(['CHECKOUT_ERROR', 'CONTACT_ERROR', 'DELIVERY_ERROR', 'DISCOUNT_ERROR', 'INPUT_INVALID',
  'INPUT_REQUIRED', 'INVENTORY_ERROR', 'MERCHANDISE_ERROR', 'PAYMENT_ERROR'])
let putopiaReference = null
let putopiaCompleted = false
const putopiaReportedFailures = new Set()

async function putopiaReportFailure(reason, observedEvent) {
  const key = `${reason}:${observedEvent}`
  if (putopiaReportedFailures.has(key)) return
  putopiaReportedFailures.add(key)
  // These unsigned reports count observation health only; they never claim a buyer or an order.
  try {
    await fetch('https://www.multiverseco.org/api/shopify/customer-events', {
      method: 'POST', headers: { 'Content-Type': 'text/plain' }, credentials: 'omit', keepalive: true,
      body: JSON.stringify({ event: 'putopia_observation_failed', pixel_version: 3,
        properties: { reason, observed_event: observedEvent } }),
    })
  } catch { /* Health observation must never interrupt checkout or recursively report itself. */ }
}

function putopiaFieldCategory(identifier) {
  const key = typeof identifier === 'string' ? identifier.toLowerCase() : ''
  if (/card|payment|billing|cvv|cvc|expiry|expiration/.test(key)) return 'payment'
  if (/discount|gift.?card|promo/.test(key)) return 'discount'
  if (/email|contact/.test(key)) return 'contact'
  if (/address|postal|zip|city|country|province|region|first.?name|last.?name|phone|company/.test(key)) return 'address'
  if (/shipping|delivery/.test(key)) return 'shipping'
  if (/checkout/.test(key)) return 'checkout'
  return 'other'
}

function putopiaInteractionProperties(event) {
  const properties = {}
  if (Number.isSafeInteger(event.seq) && event.seq >= 0 && event.seq <= 1e9) properties.shopify_seq = event.seq
  if (event.name === 'alert_displayed') {
    const alert = event.data?.alert
    properties.field_category = putopiaFieldCategory(alert?.target)
    properties.alert_type = putopiaAlertTypes.has(alert?.type) ? alert.type : 'UNKNOWN'
  } else if (event.name === 'ui_extension_errored') {
    properties.extension_error_type = event.data?.error?.type === 'EXTENSION_USAGE_ERROR' ? 'EXTENSION_USAGE_ERROR' : 'UNKNOWN'
  } else if (!putopiaStages.has(event.name)) {
    const element = event.data?.element
    // Attributes classify locally; value/textContent/href and raw identifiers are never forwarded.
    const id = typeof element?.id === 'string' ? element.id.toLowerCase() : ''
    const name = typeof element?.name === 'string' ? element.name.toLowerCase() : ''
    const type = typeof element?.type === 'string' ? element.type.toLowerCase() : ''
    properties.field_category = putopiaFieldCategory(`${id} ${name}`)
    properties.control = event.name.startsWith('input_') ? 'field'
      : /^(checkout-pay-button|pay-now|pay-button|complete-order)$/.test(id) ? 'pay_button'
        : /shop.?pay|apple.?pay|google.?pay|express.?checkout/.test(`${id} ${name}`) ? 'express_checkout'
          : type === 'submit' || event.name === 'form_submitted' ? 'submit_button' : 'other'
  }
  return properties
}

async function putopiaSend(payload) {
  const body = JSON.stringify(payload)
  const send = () => fetch('https://www.multiverseco.org/api/shopify/customer-events', {
    method: 'POST', headers: { 'Content-Type': 'text/plain' }, credentials: 'omit', keepalive: true, body,
  })
  try {
    let result = await send()
    if (result.status >= 500) result = await send()
    if (!result.ok) await putopiaReportFailure('ingest_rejected', payload.event)
  } catch {
    try {
      const result = await send()
      if (!result.ok) await putopiaReportFailure('ingest_rejected', payload.event)
    } catch { await putopiaReportFailure('network_failure', payload.event) }
  }
}

async function putopiaCheckoutEvent(event) {
  const stage = putopiaStages.has(event.name)
  const reference = event.data?.checkout?.attributes?.find(item => item.key === '_putopia_live_reservation')?.value
  if (stage && typeof reference === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.[0-9a-f]{64}$/i.test(reference)) {
    putopiaReference = reference
    if (event.name === 'checkout_started') putopiaCompleted = false
  } else if (stage) {
    // An unrelated checkout must never inherit the previous order's reference.
    putopiaReference = null
  }
  if (!stage && putopiaCompleted) return
  if (typeof event.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(event.id) || typeof event.timestamp !== 'string') {
    await putopiaReportFailure('invalid_payload', event.name)
    return
  }
  const payload = { event: event.name, event_id: event.id, timestamp: event.timestamp,
    properties: putopiaInteractionProperties(event) }
  // DOM events have no checkout object. Never guess a binding or replay storefront interactions.
  if (!putopiaReference) {
    // Preserve the boundary: never reuse a previous checkout's reference or infer one from DOM.
    if (stage) await putopiaReportFailure(reference ? 'invalid_reference' : 'missing_reference', event.name)
    return
  }
  if (event.name === 'checkout_completed') putopiaCompleted = true
  await putopiaSend({ ...payload, reference: putopiaReference })
}

analytics.subscribe('checkout_started', putopiaCheckoutEvent)
analytics.subscribe('checkout_contact_info_submitted', putopiaCheckoutEvent)
analytics.subscribe('checkout_address_info_submitted', putopiaCheckoutEvent)
analytics.subscribe('checkout_shipping_info_submitted', putopiaCheckoutEvent)
analytics.subscribe('payment_info_submitted', putopiaCheckoutEvent)
analytics.subscribe('checkout_completed', putopiaCheckoutEvent)
analytics.subscribe('clicked', putopiaCheckoutEvent)
analytics.subscribe('form_submitted', putopiaCheckoutEvent)
analytics.subscribe('input_focused', putopiaCheckoutEvent)
analytics.subscribe('input_changed', putopiaCheckoutEvent)
analytics.subscribe('input_blurred', putopiaCheckoutEvent)
analytics.subscribe('alert_displayed', putopiaCheckoutEvent)
analytics.subscribe('ui_extension_errored', putopiaCheckoutEvent)
