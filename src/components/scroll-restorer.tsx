'use client'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { safeAppPath } from '@/lib/ui-navigation'

function read(key: string) { try { return sessionStorage.getItem(key) } catch { return null } }
function save(key: string, value: string) { try { sessionStorage.setItem(key, value) } catch { /* Private storage may be unavailable. */ } }
function scroller() {
  return [...document.querySelectorAll<HTMLElement>('main, .main')].find(el => /auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight) ?? document.scrollingElement
}
/** Save the actual scrolling surface before navigation; restore tab/query context. */
export function ScrollRestorer() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  useEffect(() => {
    const route = pathname + (search ? `?${search}` : '')
    const key = `mc:scroll:${route}`
    const previousMode = history.scrollRestoration
    history.scrollRestoration = 'manual'
    let restoring = true
    const y = Number(read(key) ?? 0)
    const restore = () => {
      if (!restoring) return
      const element = scroller()
      if (!element) return
      element.scrollTo({ top: y, behavior: 'instant' })
      if (element.scrollHeight - element.clientHeight >= y && Math.abs(element.scrollTop - y) < 2) restoring = false
    }
    const observer = new MutationObserver(restore)
    observer.observe(document.querySelector('.app-shell') ?? document.body, { childList: true, subtree: true })
    const timers = [0, 100, 300, 700].map(delay => setTimeout(restore, delay))
    const stop = () => { restoring = false }
    const record = () => { if (!restoring) save(key, String(scroller()?.scrollTop ?? 0)) }
    const done = setTimeout(() => { restoring = false }, 8000)
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || anchor.target === '_blank') return
      const target = safeAppPath(anchor.href, location.origin)
      if (!target || target === route || target.startsWith(`${route}#`)) return
      save(key, String(scroller()?.scrollTop ?? 0))
      const path = new URL(target, location.origin).pathname
      save(`mc:from:${path}`, route)
    }
    document.addEventListener('click', navigate, true)
    document.addEventListener('scroll', record, { capture: true, passive: true })
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', stop)
    return () => {
      observer.disconnect(); timers.forEach(clearTimeout); clearTimeout(done)
      document.removeEventListener('click', navigate, true)
      document.removeEventListener('scroll', record, true)
      window.removeEventListener('wheel', stop); window.removeEventListener('touchstart', stop); window.removeEventListener('keydown', stop)
      history.scrollRestoration = previousMode
    }
  }, [pathname, search])
  return null
}
