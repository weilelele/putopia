import posthog from 'posthog-js'
import { captureFirstTouch, getFirstTouch } from '@/lib/utm'

if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    defaults: '2026-01-30',
    capture_pageleave: true,
    capture_exceptions: true,
  })

  captureFirstTouch()

  const utm = getFirstTouch()
  const hasUtm = Object.values(utm).some(v => v !== null)
  if (hasUtm) {
    posthog.register({
      first_touch_utm_source:   utm.utm_source,
      first_touch_utm_medium:   utm.utm_medium,
      first_touch_utm_campaign: utm.utm_campaign,
      first_touch_utm_content:  utm.utm_content,
      first_touch_fbclid:       utm.fbclid,
    })
  }
}

export function onRouterTransitionStart(url: string) {
  if (window.location.hostname !== 'localhost') {
    posthog.capture('$pageview', { $current_url: window.location.origin + url })
  }
}
