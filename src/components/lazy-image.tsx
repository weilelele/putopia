'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'

/**
 * Image that lazy-loads off-screen and fades in once decoded, letting the page
 * open immediately with whatever placeholder sits behind it (a dark tile or a
 * gradient) and filling in progressively.
 *
 * - `loading="lazy"` defers off-screen requests; `decoding="async"` keeps decode
 *   off the main thread so it never blocks interaction.
 * - Starts at opacity 0 and transitions in on load. A ref guard catches images
 *   served from cache (whose `onLoad` can fire before React attaches).
 * - The fade transition keeps `transform` animating too, so callers that scale
 *   on hover (e.g. `.world-poster-img`) still work.
 */
export function LazyImage({
  src,
  alt = '',
  className,
  style,
  fadeMs = 400,
}: {
  src: string
  alt?: string
  className?: string
  style?: CSSProperties
  fadeMs?: number
}) {
  const [loaded, setLoaded] = useState(false)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      ref={(el) => { if (el?.complete && el.naturalWidth > 0) setLoaded(true) }}
      onLoad={() => setLoaded(true)}
      style={{
        ...style,
        opacity: loaded ? 1 : 0,
        transition: `opacity ${fadeMs}ms ease, transform 0.5s ease`,
      }}
    />
  )
}
