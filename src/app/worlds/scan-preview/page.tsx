'use client'

// DEV-ONLY harness to experience the Signal Scanning components with mock data —
// no DB writes, no production data. Renders nothing in production builds.
// Throwaway: safe to delete before merge.

import { useState } from 'react'
import { ScanInitiation } from '@/components/scan-initiation'
import { WorldScanHero } from '@/components/world-scan-hero'

export default function ScanPreviewPage() {
  const [launched, setLaunched] = useState(false)
  const [retryDemo, setRetryDemo] = useState(false)
  // ~8h53m out so the countdown reads like the real thing and ticks each second.
  const [scanUntil] = useState(() => new Date(Date.now() + (8 * 3600 + 53 * 60 + 12) * 1000).toISOString())

  // Hidden only on the real production deployment; visible on branch previews + local dev.
  if (process.env.VERCEL_ENV === 'production') return null

  return (
    <div className="main">
      {launched && <ScanInitiation worldName="THE MIRROR SHORE" onComplete={() => setLaunched(false)} />}

      <div style={{ maxWidth: 720, width: '100%' }}>
        <div className="top-bar"><div className="crumbs">DEV / SCAN PREVIEW</div></div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--color-star)', margin: '1rem 0' }}>
          SIGNAL SCANNING <span style={{ color: 'var(--color-nucleus)' }}>PREVIEW</span>
        </h1>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)', marginBottom: '1.5rem' }}>
          Dev harness · mock data · no DB writes. Delete before merge.
        </p>

        <button
          onClick={() => setLaunched(true)}
          style={{ padding: '0.75rem 1.25rem', marginBottom: '2rem', background: 'rgba(232,93,4,0.1)', border: '1px solid var(--color-nucleus)', color: 'var(--color-nucleus)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', letterSpacing: '0.16em', cursor: 'pointer' }}
        >
          ▶ PLAY SCAN-INITIATION CEREMONY
        </button>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'var(--color-warn)', marginBottom: '0.75rem' }}>{'// SCANNING HERO (live countdown)'}</div>
        <WorldScanHero displayName="THE MIRROR SHORE" gradientFrom="#080F1E" gradientTo="#1A4A7A" scanUntil={scanUntil} variant="scanning" />

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'var(--color-fault)', margin: '1.5rem 0 0.75rem' }}>{'// FAILED HERO (no signal returned + retry CTA)'}</div>
        <WorldScanHero displayName="THE MIRROR SHORE" gradientFrom="#080F1E" gradientTo="#1A4A7A" scanUntil={null} variant="failed" onRetry={() => setRetryDemo(true)} />
        {retryDemo && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', border: '1px solid rgba(255,107,53,0.25)', background: 'rgba(255,107,53,0.04)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)', lineHeight: 1.7 }}>
            → On the real detail page this opens an inline editor (prefilled field notes) → RE-SCAN re-rolls a fresh 8–10h window and the world returns to scanning.
          </div>
        )}
      </div>
    </div>
  )
}
