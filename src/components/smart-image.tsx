'use client'

import Image from 'next/image'
import type { CSSProperties, SyntheticEvent } from 'react'

// Hosts allowed in next.config.ts images.remotePatterns. Anything else
// (legacy OAuth avatars, arbitrary intel image URLs) falls back to a plain
// <img> instead of crashing the optimizer.
const OPTIMIZABLE_REMOTE = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//

function isOptimizable(src: string) {
  return src.startsWith('/') || OPTIMIZABLE_REMOTE.test(src)
}

type SmartImageProps = {
  src: string
  alt: string
  /** Rendered width hint for srcset selection, e.g. "100vw", "(min-width: 768px) 400px, 100vw", "28px" */
  sizes: string
  /** Fixed-size mode: intrinsic dimensions (aspect ratio). Omit both to use fill mode — parent must be positioned + sized. */
  width?: number
  height?: number
  /** Preload for above-the-fold hero images (Next 16 name for the old `priority`). */
  preload?: boolean
  quality?: 60 | 75
  className?: string
  style?: CSSProperties
  onError?: (e: SyntheticEvent<HTMLImageElement>) => void
  onLoad?: (e: SyntheticEvent<HTMLImageElement>) => void
}

/**
 * Drop-in <img> replacement that routes local + Supabase-storage images
 * through next/image (resize, AVIF/WebP, lazy-load) and leaves unknown
 * remote hosts as plain <img>.
 */
export default function SmartImage({
  src,
  alt,
  sizes,
  width,
  height,
  preload,
  quality,
  className,
  style,
  onError,
  onLoad,
}: SmartImageProps) {
  const fill = width == null || height == null

  if (!isOptimizable(src)) {
    const fillStyle: CSSProperties = fill
      ? { position: 'absolute', inset: 0, width: '100%', height: '100%' }
      : {}
    return (
      // eslint-disable-next-line @next/next/no-img-element -- unknown remote host, next/image would reject it
      <img
        src={src}
        alt={alt}
        loading={preload ? 'eager' : 'lazy'}
        decoding="async"
        className={className}
        style={{ ...fillStyle, ...style }}
        onError={onError}
        onLoad={onLoad}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      sizes={sizes}
      {...(fill ? { fill: true } : { width: width!, height: height! })}
      preload={preload}
      quality={quality}
      className={className}
      style={style}
      onError={onError}
      onLoad={onLoad}
    />
  )
}
