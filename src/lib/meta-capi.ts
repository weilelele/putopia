import { createHash } from 'node:crypto'

export const META_DATASET_ID = '993248870105581'

export type MetaPurchaseInput = {
  eventId: string
  eventTime: number
  value: number
  currency: string
  contentId: string
  eventSourceUrl?: string | null
  email?: string | null
  phone?: string | null
  firstName?: string | null
  lastName?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  externalId?: string | null
  clientIpAddress?: string | null
  clientUserAgent?: string | null
  fbp?: string | null
  fbc?: string | null
}

function normalized(value?: string | null) {
  return value?.trim().toLowerCase() || undefined
}

function sha256(value?: string | null) {
  const input = normalized(value)
  return input ? createHash('sha256').update(input, 'utf8').digest('hex') : undefined
}

function normalizedPhone(value?: string | null) {
  const digits = value?.replace(/\D/g, '')
  return digits || undefined
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''))
}

export function buildMetaPurchasePayload(input: MetaPurchaseInput) {
  const phone = normalizedPhone(input.phone)
  const userData = compact({
    em: sha256(input.email) ? [sha256(input.email)] : undefined,
    ph: phone ? [sha256(phone)] : undefined,
    fn: sha256(input.firstName) ? [sha256(input.firstName)] : undefined,
    ln: sha256(input.lastName) ? [sha256(input.lastName)] : undefined,
    ct: sha256(input.city) ? [sha256(input.city)] : undefined,
    st: sha256(input.state) ? [sha256(input.state)] : undefined,
    zp: sha256(input.postalCode) ? [sha256(input.postalCode)] : undefined,
    country: sha256(input.country) ? [sha256(input.country)] : undefined,
    external_id: sha256(input.externalId) ? [sha256(input.externalId)] : undefined,
    client_ip_address: input.clientIpAddress?.trim() || undefined,
    client_user_agent: input.clientUserAgent?.trim() || undefined,
    fbp: input.fbp?.trim() || undefined,
    fbc: input.fbc?.trim() || undefined,
  })

  return {
    data: [{
      event_name: 'Purchase',
      event_time: input.eventTime,
      event_id: input.eventId,
      action_source: 'website',
      ...(input.eventSourceUrl ? { event_source_url: input.eventSourceUrl } : {}),
      user_data: userData,
      custom_data: {
        value: input.value,
        currency: input.currency.toUpperCase(),
        content_ids: [input.contentId],
        content_type: 'product',
        num_items: 1,
      },
    }],
  }
}

type MetaPurchaseSendOptions = {
  /** Stripe's signed event livemode flag; test codes are never sent for live events. */
  stripeLiveMode: boolean
  fetchImpl?: typeof fetch
}

export async function sendMetaPurchase(input: MetaPurchaseInput, options: MetaPurchaseSendOptions) {
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim()
  if (!token) throw new Error('Meta CAPI is not configured: META_CAPI_ACCESS_TOKEN is missing')

  const datasetId = process.env.META_DATASET_ID?.trim() || META_DATASET_ID
  if (!/^\d+$/.test(datasetId)) throw new Error('Meta CAPI dataset ID is invalid')
  const apiVersion = process.env.META_CAPI_API_VERSION?.trim() || 'v25.0'
  if (!/^v\d+\.\d+$/.test(apiVersion)) throw new Error('Meta CAPI API version is invalid')

  const endpoint = new URL(`https://graph.facebook.com/${apiVersion}/${datasetId}/events`)
  endpoint.searchParams.set('access_token', token)
  const payload = buildMetaPurchasePayload(input) as {
    data: Array<Record<string, unknown>>
    test_event_code?: string
  }

  // A dedicated code is an explicit Test Events opt-in. The Stripe signed
  // livemode flag is an additional guard that prevents it reaching production.
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim()
  if (!options.stripeLiveMode && testEventCode) {
    payload.test_event_code = testEventCode
  }

  const response = await (options.fetchImpl ?? fetch)(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })
  if (!response.ok) {
    // Do not include Meta's response body or request URL: both may contain
    // customer data or the access token.
    throw new Error(`Meta CAPI Purchase request failed with HTTP ${response.status}`)
  }

  const result = await response.json() as { events_received?: number; messages?: string[] }
  if (result.events_received !== 1) {
    throw new Error('Meta CAPI did not confirm receipt of the Purchase event')
  }
  return result
}
