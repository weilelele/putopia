import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { REDDIT_PIXEL_ID } from '@/lib/reddit-ads-config'
import {
  buildRedditCapiPayload,
  type RedditTrackingType,
} from '@/lib/reddit-capi-payload'

const REDDIT_CAPI_ENDPOINT = `https://ads-api.reddit.com/api/v3/pixels/${REDDIT_PIXEL_ID}/conversion_events`

interface SendRedditConversionInput {
  trackingType: RedditTrackingType
  conversionId: string
  clickId?: string | null
  email?: string | null
  externalId?: string | null
}

export function createRedditConversionId(): string {
  return randomUUID()
}

export async function sendRedditConversion(
  input: SendRedditConversionInput,
): Promise<{ sent: boolean; configured: boolean }> {
  const accessToken = process.env.REDDIT_CAPI_ACCESS_TOKEN
  if (!accessToken) return { sent: false, configured: false }

  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()])
  const forwardedFor = headerStore.get('x-forwarded-for')
  const ipAddress = forwardedFor?.split(',')[0]?.trim()
    || headerStore.get('x-real-ip')

  const payload = buildRedditCapiPayload({
    trackingType: input.trackingType,
    conversionId: input.conversionId,
    eventAt: Date.now(),
    eventSourceUrl: headerStore.get('referer'),
    clickId: input.clickId,
    email: input.email ? hashRedditEmail(input.email) : undefined,
    externalId: input.externalId,
    ipAddress,
    userAgent: headerStore.get('user-agent'),
    uuid: cookieStore.get('_rdt_uuid')?.value,
    testId: process.env.REDDIT_CAPI_TEST_ID,
  })

  try {
    const response = await fetch(REDDIT_CAPI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(3_000),
    })

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500)
      console.error('[reddit-capi] Conversion rejected:', response.status, detail)
      return { sent: false, configured: true }
    }

    return { sent: true, configured: true }
  } catch (error) {
    console.error('[reddit-capi] Conversion request failed:', error)
    return { sent: false, configured: true }
  }
}

function hashRedditEmail(email: string): string {
  const normalized = canonicalizeEmail(email)
  return createHash('sha256').update(normalized).digest('hex')
}

function canonicalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase()
  const at = normalized.lastIndexOf('@')
  if (at <= 0) return normalized

  const localPart = normalized.slice(0, at).split('+')[0].replaceAll('.', '')
  return `${localPart}@${normalized.slice(at + 1)}`
}
