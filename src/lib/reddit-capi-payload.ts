export type RedditTrackingType = 'LEAD' | 'SIGN_UP'

export interface RedditConversionPayloadInput {
  trackingType: RedditTrackingType
  conversionId: string
  eventAt: number
  eventSourceUrl?: string | null
  clickId?: string | null
  email?: string | null
  externalId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  uuid?: string | null
  testId?: string | null
}

export function normalizeRedditClickId(clickId?: string | null): string | undefined {
  const normalized = clickId?.trim()
  if (!normalized || normalized.length > 255) return undefined
  if (!/^[A-Za-z0-9._~-]+$/.test(normalized)) return undefined
  return normalized
}

export function appendRedditClickId(
  eventSourceUrl?: string | null,
  clickId?: string | null,
): string | undefined {
  if (!eventSourceUrl) return undefined

  try {
    const url = new URL(eventSourceUrl)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined

    const normalizedClickId = normalizeRedditClickId(clickId)
    if (normalizedClickId && !url.searchParams.has('rdt_cid')) {
      url.searchParams.set('rdt_cid', normalizedClickId)
    }
    return url.toString()
  } catch {
    return undefined
  }
}

export function buildRedditCapiPayload(input: RedditConversionPayloadInput) {
  const clickId = normalizeRedditClickId(input.clickId)
  const eventSourceUrl = appendRedditClickId(input.eventSourceUrl, clickId)
  const user = compact({
    email: input.email,
    external_id: input.externalId,
    ip_address: input.ipAddress,
    user_agent: input.userAgent,
    uuid: input.uuid,
  })

  const event = {
    event_at: input.eventAt,
    action_source: 'WEBSITE' as const,
    type: { tracking_type: input.trackingType },
    metadata: { conversion_id: input.conversionId },
    ...(clickId ? { click_id: clickId } : {}),
    ...(eventSourceUrl ? { event_source_url: eventSourceUrl } : {}),
    ...(Object.keys(user).length > 0 ? { user } : {}),
  }

  return {
    data: {
      ...(input.testId ? { test_id: input.testId } : {}),
      events: [event],
    },
  }
}

function compact<T extends Record<string, string | null | undefined>>(values: T) {
  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, string] => Boolean(entry[1])),
  )
}
