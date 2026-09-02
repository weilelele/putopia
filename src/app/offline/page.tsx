import Link from 'next/link'
import { OfflineTracker } from '@/app/offline/offline-tracker'

export default function OfflinePage() {
  return (
    <main className="main" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <OfflineTracker />
      <section className="hud-frame" style={{ width: '100%', maxWidth: 560 }}>
        <div className="hud-tick-rail hud-tick-left" />
        <div className="hud-tick-rail hud-tick-right" />
        <div className="h-eyebrow">{'// UPLINK INTERRUPTED'}</div>
        <h1 style={{
          margin: '0.75rem 0 1rem',
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--fs-h3)',
          letterSpacing: '0.08em',
          color: 'var(--color-nucleus)',
        }}>
          CONNECTION REQUIRED
        </h1>
        <p style={{
          margin: '0 auto 1.5rem',
          maxWidth: 420,
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-body)',
          lineHeight: 1.7,
          color: 'var(--color-star-dim)',
        }}>
          The Multiverse Console does not store account or world data offline. Restore your network connection to continue.
        </p>
        <Link href="/console" className="btn-primary" style={{ minHeight: 44, justifyContent: 'center' }}>
          RETRY UPLINK
        </Link>
      </section>
    </main>
  )
}
