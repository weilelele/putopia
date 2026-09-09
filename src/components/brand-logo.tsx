import Image from 'next/image'
import type { CSSProperties } from 'react'
/** Compatibility API backed exclusively by the protected brand assets. */
export function LogoMark({ size = 40, style }: { size?: number; style?: CSSProperties }) {
  return <Image src="/assets/vi-icon.png" alt="" width={size} height={size} style={{ objectFit: 'contain', ...style }} />
}
export function BrandLogo({ variant = 'lockup', markSize = 40, className, style }: { variant?: 'mark' | 'lockup'; markSize?: number; className?: string; style?: CSSProperties }) {
  return <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, ...style }}>
    <LogoMark size={markSize} />
    {variant === 'lockup' && <Image src="/assets/vi-wordmark.png" alt="Multiverse Collective" width={160} height={44} style={{ objectFit: 'contain' }} />}
  </span>
}
