'use client'

import { useEffect } from 'react'

// Full-screen ceremony shown the instant a sighting is filed. The whole screen
// IS electric snow — a dense feTurbulence static field whose grain shimmers
// (animated baseFrequency), like a detuned TV. No strobing overlay; the title
// and terminal lines sit steady on top, lines printing one by one. Auto-advances
// to the world's Signal Scanning countdown after `durationMs`.

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
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', overflow: 'hidden', fontFamily: 'var(--font-mono)' }}>

      {/* The whole screen IS the snow — dense, constant, grain shimmers via the
          animated turbulence (not a strobing opacity overlay). */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.9 }} xmlns="http://www.w3.org/2000/svg">
        <filter id="scan-snow-f">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch">
            <animate attributeName="baseFrequency" dur="0.2s" values="0.9;0.8;1;0.85;0.95" repeatCount="indefinite" />
          </feTurbulence>
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="2.2" intercept="-0.45" />
            <feFuncG type="linear" slope="2.2" intercept="-0.45" />
            <feFuncB type="linear" slope="2.2" intercept="-0.45" />
          </feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" filter="url(#scan-snow-f)" />
      </svg>

      {/* Faint CRT scanlines */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.22) 2px, rgba(0,0,0,0.22) 3px)' }} />

      {/* Legibility pool — darkens the center so the text reads over the static */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 45% at 50% 50%, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 45%, transparent 75%)' }} />

      {/* Content */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ fontSize: '2.6rem', fontWeight: 700, letterSpacing: '0.32em', color: '#FFFFFF', textShadow: '0 0 2px #000, 0 2px 16px rgba(0,0,0,0.9)' }}>
          SCANNING
        </div>

        <div style={{ marginTop: '1.6rem', width: 260, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lines.map((line, i) => (
            <div key={line} className="scan-init-line" style={{ animationDelay: `${0.5 + i * 0.85}s`, fontSize: 'var(--fs-caption)', letterSpacing: '0.08em', color: 'rgba(245,245,245,0.85)', textShadow: '0 0 2px #000, 0 1px 6px rgba(0,0,0,0.9)' }}>
              {line}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .scan-init-line { opacity: 0; animation: scanLineIn 0.3s steps(2) forwards; }
        @keyframes scanLineIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
