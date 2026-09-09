'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const SCROLLER_SELECTOR = '[data-route-scroll], .main, .landing-main'
const KEY = (path: string) => `putopia-scroll:${path}`
const RESTORE_DEADLINE_MS = 4_000
const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
  'Spacebar',
])

function findRouteScroller(): HTMLElement | null {
  return document.querySelector<HTMLElement>(SCROLLER_SELECTOR)
}

function readSaved(path: string): number {
  try {
    const value = Number(sessionStorage.getItem(KEY(path)) ?? '')
    return Number.isFinite(value) && value > 0 ? value : 0
  } catch {
    return 0
  }
}

function save(path: string, element: HTMLElement | null) {
  if (!element) return
  try {
    sessionStorage.setItem(KEY(path), String(element.scrollTop))
  } catch {
    // Session storage can be unavailable in locked-down embedded browsers.
  }
}

export function ScrollRestorer() {
  const pathname = usePathname()
  const currentPath = useRef(pathname)

  useEffect(() => {
    history.scrollRestoration = 'manual'
  }, [])

  useEffect(() => {
    currentPath.current = pathname
  }, [pathname])

  // Save before Next replaces the old route DOM. Waiting for a pathname effect
  // is too late: the previous scroll container may already have been removed.
  useEffect(() => {
    const saveBeforeNavigation = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest<HTMLAnchorElement>('a[href]')
      if (!anchor) return

      const destination = new URL(anchor.href, window.location.href)
      if (destination.origin !== window.location.origin) return
      if (destination.pathname === window.location.pathname) return
      save(currentPath.current, findRouteScroller())
    }

    document.addEventListener('pointerdown', saveBeforeNavigation, true)
    document.addEventListener('click', saveBeforeNavigation, true)
    return () => {
      document.removeEventListener('pointerdown', saveBeforeNavigation, true)
      document.removeEventListener('click', saveBeforeNavigation, true)
    }
  }, [])

  // Continuously remember the actual page scroller. The app shell fixes body
  // in place, so window.scrollY is always zero on the primary routes.
  useEffect(() => {
    if (pathname === '/console') return

    let element = findRouteScroller()
    let debounce: ReturnType<typeof setTimeout> | undefined

    const flush = () => save(pathname, element)
    const onScroll = (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLElement) || !target.matches(SCROLLER_SELECTOR)) return
      element = target
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(flush, 120)
    }

    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('pagehide', flush)
      if (debounce) clearTimeout(debounce)
      flush()
    }
  }, [pathname])

  // Dashboard already has a content-aware restorer in ConsoleClient. Other
  // routes share this implementation, including pages whose loading shell is
  // replaced or whose content grows after an async client read.
  useLayoutEffect(() => {
    if (pathname === '/console') return
    const saved = readSaved(pathname)
    if (!saved) return

    let stopped = false
    let element: HTMLElement | null = null
    const resizeObserver = new ResizeObserver(() => pin())

    const watch = (next: HTMLElement) => {
      if (element === next) return
      resizeObserver.disconnect()
      element = next
      resizeObserver.observe(next)
      for (const child of next.children) resizeObserver.observe(child)
    }

    const pin = () => {
      if (stopped) return
      const next = findRouteScroller()
      if (!next) return
      watch(next)
      const maximum = Math.max(0, next.scrollHeight - next.clientHeight)
      const target = Math.min(saved, maximum)
      if (Math.abs(next.scrollTop - target) > 1) next.scrollTop = target
    }

    const mutationObserver = new MutationObserver(pin)
    mutationObserver.observe(document.querySelector('.app-shell') ?? document.body, {
      childList: true,
      subtree: true,
    })

    const stop = () => {
      if (stopped) return
      stopped = true
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      clearTimeout(deadline)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', onKey, true)
    }
    const onKey = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) stop()
    }

    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', onKey, true)

    const deadline = setTimeout(stop, RESTORE_DEADLINE_MS)
    pin()

    return stop
  }, [pathname])

  return null
}
