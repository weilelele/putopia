'use client'

import { useEffect, useState, type ReactNode } from 'react'
import posthog from 'posthog-js'
import { isWindowActive, startAccessWindow } from '@/lib/access-window'
import { AccessCountdown } from '@/components/access-countdown'

/**
 * "More Internal Information" gate with a granted glimpse.
 *
 * Frozen by default: the whole feed renders frosted with a single entry — the
 * Collective offers a timed look inside. Clicking it unfreezes only the TOP of
 * the feed; the lower content stays frosted (there's always more inside). During
 * the glimpse a quiet countdown rides the right edge, and it re-freezes when the
 * clock runs out. Activation lives in the hero's Request access / Login — kept
 * out of here on purpose to avoid clutter. Members never see any of this.
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const [peeking, setPeeking] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resumes an in-progress glimpse from localStorage (unavailable during SSR)
    setPeeking(isWindowActive())
  }, [])

  const startPeek = () => {
    posthog.capture('glimpse_start_clicked')
    startAccessWindow()
    setPeeking(true)
  }

  return (
    <>
      <div style={{ position: 'relative' }}>
        <div
          aria-hidden={!peeking}
          style={{
            filter: peeking ? 'blur(0px)' : 'blur(7px)',
            transition: 'filter 0.6s ease-out',
            pointerEvents: peeking ? 'auto' : 'none',
            userSelect: peeking ? 'auto' : 'none',
          }}
        >
          {children}
        </div>

        {peeking ? (
          /* Only the top is unfrozen — the rest stays inside. */
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '52%',
              background:
                'linear-gradient(to bottom, rgba(10,14,39,0) 0%, rgba(10,14,39,0.55) 38%, rgba(10,14,39,0.96) 100%)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: '2.5rem',
              pointerEvents: 'none',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.14em', color: 'var(--color-star-dim)' }}>
              The rest stays inside — activate to see it all
            </span>
          </div>
        ) : (
          /* Frozen — single entry. */
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(10,14,39,0.45)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                margin: 'clamp(1.5rem, 8vh, 4rem) 1.25rem',
                maxWidth: 380,
                width: '100%',
                background: 'rgba(14,18,40,0.82)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                borderRadius: 'var(--radius)',
                padding: '1.6rem 1.5rem',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'var(--color-nucleus)' }}>
                MULTIVERSE COLLECTIVE · INTERNAL
              </div>
              <p style={{ fontSize: 'var(--fs-label)', color: 'var(--color-star)', opacity: 0.9, lineHeight: 1.65, margin: '0.8rem 0 0' }}>
                Members only. We&apos;ll let you look inside for 5 minutes.
              </p>
              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '1.4rem' }}
                onClick={startPeek}
              >
                Yes, I need it
              </button>
            </div>
          </div>
        )}
      </div>

      {peeking && <AccessCountdown onExpire={() => setPeeking(false)} />}
    </>
  )
}
