'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const KEY = (path: string) => `putopia-scroll:${path}`

// Pages that load content asynchronously need a longer settle delay so the
// DOM has time to expand before we try to scroll into it.
const ASYNC_PAGES = ['/console', '/intel', '/devices', '/voyagers', '/vote', '/worlds', '/logs']
const SETTLE_MS = 200

export function ScrollRestorer() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    // Tell the browser not to manage scroll — we handle it ourselves.
    if (typeof window !== 'undefined') {
      history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    // ── Save scroll position for the page we just LEFT ──────────────────
    const previous = lastPath.current
    if (previous && previous !== pathname) {
      // The scroll position at the moment of navigation is still valid here
      // because this effect fires synchronously before the new page renders.
      sessionStorage.setItem(KEY(previous), String(window.scrollY))
    }
    lastPath.current = pathname

    // ── Restore scroll position for the page we just ARRIVED at ─────────
    const saved = sessionStorage.getItem(KEY(pathname))
    if (!saved) return   // first visit — start at top

    const y = parseInt(saved, 10)
    if (!y) return

    const isAsync = ASYNC_PAGES.some(p => pathname === p || pathname.startsWith(p + '/'))
    const delay = isAsync ? SETTLE_MS : 0

    const timer = setTimeout(() => {
      window.scrollTo({ top: y, behavior: 'instant' })
    }, delay)

    return () => clearTimeout(timer)
  }, [pathname])

  // ── Continuously save scroll while the user scrolls ───────────────────
  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout>

    const onScroll = () => {
      clearTimeout(debounce)
      debounce = setTimeout(() => {
        sessionStorage.setItem(KEY(pathname), String(window.scrollY))
      }, 120)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(debounce)
    }
  }, [pathname])

  return null
}
