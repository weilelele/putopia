import { getPostHogClient } from '@/lib/posthog-server'

/**
 * Server-side Device outcome events (what actually happened, as opposed to what
 * the browser attempted). Failures to report are logged and swallowed so they
 * can never change a checkout, follow, or post result.
 */
export async function captureDeviceServerEvent(
  distinctId: string | null | undefined,
  event: string,
  properties: Record<string, unknown> = {},
) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  try {
    const client = getPostHogClient()
    client.capture({ distinctId: distinctId ?? 'anonymous', event, properties: { ...properties, source: 'server' } })
    await client.shutdown()
  } catch (error) {
    console.warn('[device-analytics] capture failed:', event, error)
  }
}
