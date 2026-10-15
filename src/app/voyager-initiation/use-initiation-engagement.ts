'use client'

import { useEffect, useEffectEvent, useRef } from 'react'
import { getRouteScrollContainer } from '@/lib/route-scroll-container'
import { contentDepth, createEngagementMeter, sectionVisible } from '@/lib/initiation-engagement'

export function useInitiationEngagement(capture: (event: string, properties?: Record<string, unknown>) => void, modalOpen: boolean) {
  const meterRef = useRef<ReturnType<typeof createEngagementMeter> | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const emit = useEffectEvent(capture)
  const isBlocked = useEffectEvent(() => modalOpen)
  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    const meter = meterRef.current ??= createEngagementMeter((event, props) => emit(event, { ...props, engagement_version: '20261016' }))
    let lastInteraction = performance.now()
    let ended = false
    const sample = () => {
      if (ended) return
      const now = performance.now()
      const root = getRouteScrollContainer(content.closest('main'))
      const rect = root && root !== document.scrollingElement ? root.getBoundingClientRect() : null
      const top = Math.max(0, rect?.top ?? 0)
      const bottom = Math.min(window.innerHeight, rect?.bottom ?? window.innerHeight)
      const active = document.visibilityState === 'visible' && document.hasFocus() && !isBlocked()
        && !document.querySelector('dialog[open]') && now - lastInteraction < 60000
      const visible = [...content.querySelectorAll<HTMLElement>('[data-initiation-section]')]
        .filter(el => { const r = el.getBoundingClientRect(); return el.getClientRects().length > 0 && sectionVisible(r.top, r.bottom, top, bottom) })
        .map(el => el.dataset.initiationSection!)
      const bounds = content.getBoundingClientRect()
      meter.sample(now, visible, contentDepth(bounds.top, bounds.height, bottom), active)
    }
    const interact = () => { lastInteraction = performance.now(); sample() }
    const flush = () => { sample(); meter.flush() }
    const leave = () => { sample(); meter.sample(performance.now(), [], 0, false); meter.flush(); ended = true }
    const resume = () => { ended = false; interact() }
    const timer = setInterval(sample, 250)
    const checkpoint = setInterval(flush, 10000)
    document.addEventListener('scroll', interact, true)
    document.addEventListener('pointerdown', interact, true)
    document.addEventListener('keydown', interact, true)
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('blur', flush)
    window.addEventListener('focus', interact)
    window.addEventListener('pagehide', leave)
    window.addEventListener('pageshow', resume)
    window.addEventListener('resize', sample)
    sample()
    return () => {
      leave(); clearInterval(timer); clearInterval(checkpoint)
      document.removeEventListener('scroll', interact, true)
      document.removeEventListener('pointerdown', interact, true)
      document.removeEventListener('keydown', interact, true)
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('blur', flush); window.removeEventListener('focus', interact)
      window.removeEventListener('pagehide', leave); window.removeEventListener('pageshow', resume)
      window.removeEventListener('resize', sample)
    }
  }, [])
  return contentRef
}
