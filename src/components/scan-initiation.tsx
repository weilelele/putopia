'use client'

import { useEffect } from 'react'

// Full-screen ceremony shown the instant a sighting is filed. Deliberately raw
// and retro: flickering electric snow (feTurbulence static), a "SCANNING" title,
// and terminal lines printing out one by one. Auto-advances to the world's
// Signal Scanning countdown after `durationMs`.

export function ScanInitiation({
  worldName,
  durationMs = 4800,
  onComplete,
}: {
  worldName: string
  durationMs?: number
  onComplete: () => void
}) {
  useEffect(() => {
    const id = setTimeout(onComplete, durationMs)
    return () => clearTimeout(id)
  }, [durationMs, onComplete])

  const lines = [
    `> TARGET: ${worldName}`,
    '> LOCKING COORDINATES',
    '> SWEEPING FREQUENCY BANDS',
    '> DISPATCHING PROBE TO FIELD',
    '> FIRST READING IN 8–10 HRS',
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#05060D', overflow: 'hidden', fontFamily: 'var(--font-mono)' }}>

      {/* Electric snow — animated, flickering TV static */}
      <svg className="scan-snow" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
        <filter id="scan-snow-f">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch">
            <animate attributeName="baseFrequency" dur="0.4s" values="0.85;0.7;1;0.78;0.92" repeatCount="indefinite" />
          </feTurbulence>
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#scan-snow-f)" />
      </svg>

      {/* Faint CRT scanlines */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 3px)' }} />

      {/* Content */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div className="scan-title" style={{ fontSize: '2.6rem', fontWeight: 700, letterSpacing: '0.32em', color: '#F5F5F5', textShadow: '0 0 18px rgba(245,245,245,0.25)' }}>
          SCANNING
        </div>

        <div style={{ marginTop: '1.6rem', width: 260, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lines.map((line, i) => (
            <div key={line} className="scan-init-line" style={{ animationDelay: `${0.5 + i * 0.85}s`, fontSize: 'var(--fs-caption)', letterSpacing: '0.08em', color: 'var(--color-star-dim)' }}>
              {line}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .scan-snow { opacity: 0.45; mix-blend-mode: screen; animation: scanSnowFlicker 0.18s steps(1) infinite; }
        @keyframes scanSnowFlicker { 0% { opacity: 0.32; } 20% { opacity: 0.6; } 40% { opacity: 0.22; } 60% { opacity: 0.55; } 80% { opacity: 0.3; } 100% { opacity: 0.48; } }
        .scan-title { animation: scanTitleFlicker 2.4s steps(1) infinite; }
        @keyframes scanTitleFlicker { 0%,100% { opacity: 1; } 47% { opacity: 1; } 48% { opacity: 0.4; } 49% { opacity: 1; } 88% { opacity: 1; } 89% { opacity: 0.55; } 90% { opacity: 1; } }
        .scan-init-line { opacity: 0; animation: scanLineIn 0.3s steps(2) forwards; }
        @keyframes scanLineIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
