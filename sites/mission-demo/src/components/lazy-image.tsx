'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import SmartImage from './smart-image'

/**
 * Image that lazy-loads off-screen and fades in once decoded, letting the page
 * open immediately with whatever placeholder sits behind it (a dark tile or a
 * gradient) and filling in progressively.
 *
 * Renders through SmartImage (next/image resize + AVIF/WebP for local and
 * Supabase-storage sources) in fill mode — the parent element must be
 * positioned and sized.
 *
 * - Starts at opacity 0 and transitions in on load.
 * - The fade transition keeps `transform` animating too, so callers that scale
 *   on hover (e.g. `.world-poster-img`) still work.
 */
export function LazyImage({
  src,
  alt = '',
  className,
  style,
  fadeMs = 400,
  sizes = '(min-width: 768px) 600px, 100vw',
}: {
  src: string
  alt?: string
  className?: string
  style?: CSSProperties
  fadeMs?: number
  sizes?: string
}) {
  const [loaded, setLoaded] = useState(false)
  return (
    <SmartImage
      src={src}
      alt={alt}
      sizes={sizes}
      className={className}
      onLoad={() => setLoaded(true)}
      style={{
        ...style,
        opacity: loaded ? 1 : 0,
        transition: `opacity ${fadeMs}ms ease, transform 0.5s ease`,
      }}
    />
  )
}
