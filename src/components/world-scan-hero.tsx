'use client'

import { useEffect, useState } from 'react'
import { scanSecondsLeft } from '@/lib/signal/scan'

// Detail-page hero for a world still in (or just out of) its Signal Scanning
// window. `scanning` shows a live countdown over the world's atmosphere;
// `failed` shows the no-signal-returned state. Both replace the normal hero.

function fmt(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = Math.floor(total % 60)
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export function WorldScanHero({
  displayName,
  gradientFrom,
  gradientTo,
  scanUntil,
  variant,
  onComplete,
  onRetry,
}: {
  displayName: string
  gradientFrom: string
  gradientTo: string
  scanUntil: string | null
  variant: 'scanning' | 'failed'
  onComplete?: () => void
  /** Owner-only: revise & re-scan from the failed state. Renders the CTA when set. */
  onRetry?: () => void
}) {
  const [left, setLeft] = useState(() => scanSecondsLeft(scanUntil))

  useEffect(() => {
    if (variant !== 'scanning') return
    const id = setInterval(() => {
      const next = scanSecondsLeft(scanUntil)
      setLeft(next)
      if (next <= 0) {
        clearInterval(id)
        onComplete?.()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [scanUntil, variant, onComplete])

  const failed = variant === 'failed'
  const accent = failed ? 'var(--color-fault)' : 'var(--color-warn)'

  return (
    <div style={{ width: '100%', height: '280px', position: 'relative', overflow: 'hidden', marginBottom: '1.5rem', border: `1px solid ${accent}40` }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`, filter: failed ? 'grayscale(0.6) brightness(0.6)' : undefined }} />
      {/* scanlines */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.10) 2px, rgba(0,0,0,0.10) 4px)', pointerEvents: 'none' }} />
      {!failed && <div className="scan-hero-sweep" style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'rgba(255,176,32,0.6)' }} />}
      {/* legibility fade */}
      <div style={{ position: 'absolute', inset: 0, background: failed
        ? 'linear-gradient(to bottom, rgba(20,8,8,0.25) 25%, rgba(40,12,12,0.5) 60%, rgba(10,5,5,0.92) 100%)'
        : 'linear-gradient(to bottom, transparent 25%, rgba(160,90,4,0.30) 60%, rgba(10,7,2,0.9) 100%)', pointerEvents: 'none' }} />

      {/* status badge */}
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(7,9,18,0.75)', border: `1px solid ${accent}66`, padding: '3px 9px' }}>
        <span className={failed ? undefined : 'scan-hero-dot'} style={{ width: 7, height: 7, borderRadius: '50%', background: accent, flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.16em', color: accent }}>
          {failed ? 'NO SIGNAL' : 'SIGNAL SCANNING'}
        </span>
      </div>

      {/* center block */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 1rem', textAlign: 'center' }}>
        {failed ? (
          <>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'var(--color-star-dim)' }}>SCAN COMPLETE</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h3)', fontWeight: 700, color: 'var(--color-star)', letterSpacing: '0.04em' }}>NO READING RETURNED</span>
            {onRetry && (
              <button
                onClick={onRetry}
                style={{ marginTop: 12, padding: '0.5rem 1rem', background: 'rgba(232,93,4,0.12)', border: '1px solid var(--color-nucleus)', color: 'var(--color-nucleus)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.16em', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                ✎ DESCRIBE MORE · RE-SCAN
              </button>
            )}
          </>
        ) : (
          <>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'rgba(245,245,245,0.6)' }}>SIGNALS RETURN IN</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '2.4rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-star)', fontVariantNumeric: 'tabular-nums', textShadow: '0 2px 14px rgba(0,0,0,0.7)' }}>
              {fmt(left)}
            </span>
          </>
        )}
      </div>

      {/* title */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem 1.25rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h3)', fontWeight: 700, color: 'var(--color-star)', lineHeight: 1.2, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
          {displayName}
        </div>
      </div>

      <style>{`
        @keyframes scanHeroSweep { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 278px; opacity: 0; } }
        @keyframes scanHeroDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        .scan-hero-sweep { animation: scanHeroSweep 3s linear infinite; }
        .scan-hero-dot { animation: scanHeroDot 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
