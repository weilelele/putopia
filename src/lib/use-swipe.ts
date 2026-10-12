'use client'
import { useEffect, useRef } from 'react'
import { swipeDirection, type SwipeDirection } from '@/lib/swipe'

// Places where a horizontal drag already means something else.
const IGNORE = 'dialog, input, textarea, select, video, .archive-tabs, [data-no-swipe]'

/** Calls `onSwipe` for a deliberate left/right swipe anywhere on the page. No visual affordance. */
export function useSwipe(onSwipe: (direction: SwipeDirection) => void, enabled = true) {
  const handler = useRef(onSwipe)
  useEffect(() => { handler.current = onSwipe }, [onSwipe])

  useEffect(() => {
    if (!enabled) return
    let start: { x: number; y: number } | null = null
    const onStart = (event: TouchEvent) => {
      const target = event.target as Element | null
      start = event.touches.length === 1 && !target?.closest(IGNORE) ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null
    }
    const onEnd = (event: TouchEvent) => {
      if (!start || event.changedTouches.length !== 1) return
      const end = event.changedTouches[0]
      const direction = swipeDirection({ startX: start.x, startY: start.y, endX: end.clientX, endY: end.clientY, viewportWidth: window.innerWidth })
      start = null
      if (direction && !window.getSelection()?.toString()) handler.current(direction)
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => { document.removeEventListener('touchstart', onStart); document.removeEventListener('touchend', onEnd) }
  }, [enabled])
}
