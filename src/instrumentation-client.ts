import posthog from 'posthog-js'
import { captureFirstTouch, getFirstTouch } from '@/lib/utm'
import { captureInitiationAdAttribution } from '@/lib/initiation-attribution-client'
import { minimizeRegistrationErrorEvent } from '@/lib/registration-errors'
import { aiReferralProperties, classifyAiReferral } from '@/lib/ai-referrer'

if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    defaults: '2026-01-30',
    capture_pageleave: true,
    capture_exceptions: true,
    before_send: minimizeRegistrationErrorEvent,
    // `loaded` runs before the initial $pageview is sent, so the AI-referral
    // super properties land on the landing pageview and every later event.
    loaded: (ph) => {
      const aiReferral = classifyAiReferral(document.referrer, window.location.search)
      if (aiReferral) {
        const props = aiReferralProperties(aiReferral)
        ph.register_for_session(props.session)
        ph.register_once(props.firstTouch)
      }
    },
  })

  captureFirstTouch()
  captureInitiationAdAttribution()

  const utm = getFirstTouch()
  const hasUtm = Object.values(utm).some(v => v !== null)
  if (hasUtm) {
    posthog.register({
      first_touch_utm_source:   utm.utm_source,
      first_touch_utm_medium:   utm.utm_medium,
      first_touch_utm_campaign: utm.utm_campaign,
      first_touch_utm_content:  utm.utm_content,
      first_touch_fbclid:       utm.fbclid,
      first_touch_rdt_cid:      utm.rdt_cid,
    })
  }
}

export function onRouterTransitionStart(url: string) {
  if (window.location.hostname !== 'localhost') {
    captureInitiationAdAttribution(new URL(url, window.location.origin).search)
    posthog.capture('$pageview', { $current_url: window.location.origin + url })
  }
}
