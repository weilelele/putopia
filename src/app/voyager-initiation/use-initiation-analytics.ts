'use client'

import { useEffect, useRef } from 'react'
import posthog from 'posthog-js'
import { getFirstTouch } from '@/lib/utm'
import { getRouteScrollContainer } from '@/lib/route-scroll-container'
import { createPriceExposureGate, initiationAnalyticsProperties, sanitizeInitiationAnalytics, visiblePriceRatio, type InitiationAnalyticsContext } from '@/lib/initiation-analytics'
import { captureInitiationAdAttribution } from '@/lib/initiation-attribution-client'
import type { InitiationOrderKind } from '@/lib/initiation-types'

export function useInitiationAnalytics({ kind, userId, internal, environment, eligible, modalOpen }: {
  kind: InitiationOrderKind; userId: string | null; internal: boolean; environment: string; eligible: boolean; modalOpen: boolean
}) {
  const priceRef = useRef<HTMLParagraphElement>(null)
  const context = useRef<InitiationAnalyticsContext | null>(null)
  const pageCaptured = useRef(false)
  const exposed = useRef(new Set<InitiationOrderKind>())
  const getContext = () => {
    if (!context.current) {
      let utm = {}
      try { utm = getFirstTouch() } catch { /* Storage may be unavailable. */ }
      const adContext = captureInitiationAdAttribution()
      context.current = sanitizeInitiationAnalytics({ ...utm, ...adContext, page_visit_id: crypto.randomUUID(),
        is_internal_qa: internal || new URLSearchParams(location.search).get('qa') === '1', disabled: posthog.has_opted_out_capturing() })
    }
    return context.current
  }
  const capture = (event: string, extra: Record<string, unknown> = {}) => {
    try {
      if (userId && posthog.get_distinct_id() !== userId) posthog.identify(userId)
      else if (!userId && posthog.get_property('$user_id')) posthog.reset()
      posthog.capture(event, { ...initiationAnalyticsProperties(kind, getContext()),
        is_internal_qa: internal || getContext().is_internal_qa === true, is_test: environment !== 'production', source: 'client', ...extra })
    } catch { /* Analytics cannot prevent navigation or checkout. */ }
  }
  useEffect(() => {
    if (!pageCaptured.current) { pageCaptured.current = true; capture('initiation_page_viewed') }
    // A route visit has a fixed identity; status/tier hydration must not add pageviews.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    const element = priceRef.current
    if (!element || !eligible || exposed.current.has(kind)) return
    const visible = () => {
      if (document.visibilityState !== 'visible' || !document.hasFocus() || modalOpen || document.querySelector('dialog[open]')) return false
      const root = getRouteScrollContainer(element.closest<HTMLElement>('main'))
      const rootRect = root && root !== document.scrollingElement ? root.getBoundingClientRect() : null
      const viewport = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
      const clip = rootRect ? { left: Math.max(0, rootRect.left), top: Math.max(0, rootRect.top),
        right: Math.min(viewport.right, rootRect.right), bottom: Math.min(viewport.bottom, rootRect.bottom) } : viewport
      return element.getClientRects().length > 0 && visiblePriceRatio(element.getBoundingClientRect(), clip) >= 0.5
    }
    const gate = createPriceExposureGate({ schedule: (fn, ms) => setTimeout(fn, ms), cancel: timer => clearTimeout(timer as ReturnType<typeof setTimeout>),
      stillVisible: visible, expose: () => { exposed.current.add(kind); capture('initiation_price_viewed', { visibility_threshold: 0.5, continuous_ms: 1000 }) } })
    const update = () => gate.update(visible())
    // Capturing scroll also handles the phone route and desktop shell independently.
    document.addEventListener('scroll', update, true)
    document.addEventListener('visibilitychange', update)
    window.addEventListener('resize', update)
    window.addEventListener('focus', update)
    window.addEventListener('blur', update)
    const observer = new MutationObserver(update)
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] })
    const resize = new ResizeObserver(update)
    resize.observe(element)
    const scrollRoot = getRouteScrollContainer(element.closest<HTMLElement>('main'))
    const intersection = new IntersectionObserver(update, { root: scrollRoot === document.scrollingElement ? null : scrollRoot, threshold: [0, 0.5, 1] })
    intersection.observe(element)
    update()
    return () => { gate.dispose(); observer.disconnect(); resize.disconnect(); intersection.disconnect(); document.removeEventListener('scroll', update, true)
      document.removeEventListener('visibilitychange', update); window.removeEventListener('resize', update); window.removeEventListener('focus', update); window.removeEventListener('blur', update) }
    // Capture reads the current tier; each tier is observed once in this route visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, eligible, modalOpen])
  return { priceRef, capture, getContext }
}
