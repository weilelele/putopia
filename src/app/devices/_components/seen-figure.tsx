'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/** A <figure> that calls `onSeen` once, when at least 60% of it is on screen. */
export function SeenFigure({ className, onSeen, children }: {
  className?: string
  onSeen: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const callback = useRef(onSeen)
  useEffect(() => { callback.current = onSeen })
  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      callback.current()
    }, { threshold: 0.6 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <figure className={className} ref={ref}>{children}</figure>
}
