import posthog from 'posthog-js'

if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    defaults: '2026-01-30',
    capture_pageleave: true,
    capture_exceptions: true,
  })
}

export function onRouterTransitionStart(url: string) {
  if (window.location.hostname !== 'localhost') {
    posthog.capture('$pageview', { $current_url: window.location.origin + url })
  }
}
