import posthog from 'posthog-js'

/**
 * Client-side Device funnel events. Every name is prefixed `device_` so the
 * whole Device data chain can be filtered in one PostHog query. Analytics must
 * never break the UI, so capture errors are swallowed.
 */
export function trackDevice(event: string, properties: Record<string, unknown> = {}) {
  try {
    posthog.capture(event, properties)
  } catch { /* Blocked or uninitialised analytics must not affect the page. */ }
}
