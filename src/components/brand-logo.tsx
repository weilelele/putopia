import type { CSSProperties } from 'react'

/**
 * @deprecated Code-drawn approximation retained for legacy screens. New Style
 * A surfaces must use ArchiveBrandHeader and the protected PNG brand assets.
 * MULTIVERSE COLLECTIVE brand mark.
 * Uses currentColor for fill/stroke, so set `color` (or text color) to recolor it.
 * - mark:     icon only (concentric lens + flanking pills)
 * - lockup:   icon + stacked "MULTIVERSE / COLLECTIVE" wordmark (default)
 */
type Variant = 'mark' | 'lockup'

export function LogoMark({ size = 28, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={(size * 120) / 200}
      viewBox="0 0 200 120"
      fill="none"
      aria-hidden
      style={style}
    >
      <g fill="currentColor" stroke="currentColor">
        <rect x="40" y="26" width="16" height="68" rx="8" stroke="none" />
        <rect x="144" y="26" width="16" height="68" rx="8" stroke="none" />
        <circle cx="100" cy="60" r="35" fill="none" strokeWidth="3.6" />
        <circle cx="100" cy="60" r="27" fill="none" strokeWidth="2.8" />
        <circle cx="100" cy="60" r="20" fill="none" strokeWidth="2.8" />
        <circle cx="100" cy="60" r="13" fill="none" strokeWidth="2.8" />
        <circle cx="100" cy="60" r="6" stroke="none" />
      </g>
    </svg>
  )
}

export function BrandLogo({
  variant = 'lockup',
  markSize = 30,
  className,
  style,
}: {
  variant?: Variant
  markSize?: number
  className?: string
  style?: CSSProperties
}) {
  if (variant === 'mark') {
    return (
      <span className={className} style={{ color: 'var(--color-nucleus)', display: 'inline-flex', ...style }}>
        <LogoMark size={markSize} />
      </span>
    )
  }

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.6rem',
        color: 'var(--color-nucleus)',
        ...style,
      }}
    >
      <LogoMark size={markSize} style={{ flexShrink: 0 }} />
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: `${markSize * 0.42}px`,
          lineHeight: 1.04,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        Multiverse<br />Collective
      </span>
    </span>
  )
}
