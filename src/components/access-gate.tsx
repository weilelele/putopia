'use client'

import { useEffect, useState, type ReactNode } from 'react'
import posthog from 'posthog-js'
import { isWindowActive, startAccessWindow } from '@/lib/access-window'
import { AccessCountdown } from '@/components/access-countdown'
import { useActivateAccess } from '@/components/activate-action'

/** Reveal animation length when a glimpse is granted, in ms. */
const REVEAL_MS = 1400

/**
 * "More Internal Information" gate with a granted glimpse.
 *
 * Frozen by default with a single entry — a timed look inside. Tapping it plays
 * a "signal lock" reveal (static clears + a SIGNAL LOCKED readout + scan line,
 * with a CRT-style flicker) as the top of the feed resolves into view; the lower
 * content stays frosted. A quiet right-edge countdown re-freezes on expiry. Once
 * a glimpse is spent, the re-frozen panel also offers "Activate now".
 */
export function AccessGate({
  children,
  permanentHref = '/new',
  loginHref = '/login',
}: {
  children: ReactNode
  permanentHref?: string
  loginHref?: string
}) {
  const [peeking, setPeeking] = useState(false)
  const [revealing, setRevealing] = useState(false)
  const { trigger: getFullAccess, modal: activateModal } = useActivateAccess(permanentHref, loginHref)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrates window state from localStorage on mount (unavailable during SSR)
    setPeeking(isWindowActive())
  }, [])

  const startPeek = () => {
    posthog.capture('glimpse_start_clicked')
    startAccessWindow()
    setPeeking(true)
    setRevealing(true)
    setTimeout(() => setRevealing(false), REVEAL_MS)
  }

  return (
    <>
      <style>{`
        @keyframes gateReveal{0%{filter:blur(7px);opacity:.25}7%{opacity:1}12%{opacity:.3}20%{opacity:1;filter:blur(4px)}28%{opacity:.5}38%{opacity:1;filter:blur(2.5px)}50%{opacity:.72}60%{opacity:1;filter:blur(1.2px)}72%{opacity:.9}82%{opacity:1}100%{opacity:1;filter:blur(0)}}
        @keyframes gateNoise{0%{opacity:.55}10%{opacity:.2}18%{opacity:.6}30%{opacity:.15}45%{opacity:.45}60%{opacity:.1}80%{opacity:.22}100%{opacity:0}}
        @keyframes gateScan{0%{opacity:0;top:0}8%{opacity:.85}92%{opacity:.85;top:100%}100%{opacity:0;top:100%}}
      `}</style>

      <div style={{ position: 'relative' }}>
        <div
          aria-hidden={!peeking}
          style={{
            // Blurred empty headroom so the frost (and the reveal flicker over
            // it) sit ABOVE the first post — the soft edge lands in this gap, not
            // grazing the post boundary.
            paddingTop: 44,
            filter: peeking ? 'blur(0px)' : 'blur(7px)',
            transition: revealing ? 'none' : 'filter 0.6s ease-out',
            animation: revealing ? `gateReveal ${REVEAL_MS}ms linear forwards` : 'none',
            pointerEvents: peeking && !revealing ? 'auto' : 'none',
            userSelect: peeking ? 'auto' : 'none',
          }}
        >
          {children}
        </div>

        {revealing && <RevealOverlay durationMs={REVEAL_MS} />}

        {peeking && !revealing && (
          /* Only the top is unfrozen — the rest stays inside. */
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '45%',
              background:
                'linear-gradient(to bottom, rgba(10,14,39,0) 0%, rgba(10,14,39,0.55) 40%, rgba(10,14,39,0.96) 100%)',
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
        )}

        {!peeking && (
          /* Frozen — single entry, plus "Activate now" once a glimpse is spent. */
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(10,14,39,0) 0, rgba(10,14,39,0.45) 64px, rgba(10,14,39,0.45) calc(100% - 56px), rgba(10,14,39,0) 100%)',
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
              <p style={{ fontSize: 'var(--fs-label)', color: 'var(--color-star)', opacity: 0.9, lineHeight: 1.8, letterSpacing: '0.08em', margin: 0 }}>
                MEMBERS ONLY.<br />5 MINUTES OF UNRESOLVED ACCESS ALLOWED.<br />ENTER THE COLLECTIVE?
              </p>

              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '1.4rem' }}
                onClick={startPeek}
              >
                CONFIRM
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.7rem' }}
                onClick={() => getFullAccess('gate')}
              >
                GET FULL ACCESS
              </button>
            </div>
          </div>
        )}
      </div>

      {peeking && <AccessCountdown onExpire={() => setPeeking(false)} />}

      {activateModal}
    </>
  )
}

/** Signal-lock reveal overlay: static flicker + scan line + acquiring readout. */
function RevealOverlay({ durationMs }: { durationMs: number }) {
  const [pct, setPct] = useState(0)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    let p = 0
    const id = setInterval(() => {
      p += Math.ceil(Math.random() * 9) + 4
      if (p >= 100) {
        clearInterval(id)
        setPct(100)
        setLocked(true)
      } else {
        setPct(p)
      }
    }, Math.max(45, Math.floor(durationMs / 22)))
    return () => clearInterval(id)
  }, [durationMs])

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <svg width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', animation: `gateNoise ${durationMs}ms steps(1) forwards` }}>
        <filter id="gate-rev-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#gate-rev-noise)" />
      </svg>

      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, background: 'var(--color-nucleus)', boxShadow: '0 0 14px 2px rgba(227,82,5,0.65)', animation: `gateScan ${durationMs}ms ease-in-out forwards` }} />

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '42%',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-label)',
          letterSpacing: '0.22em',
          color: 'var(--color-nucleus)',
          textShadow: '0 0 10px rgba(227,82,5,0.5)',
        }}
      >
        {locked ? '● SIGNAL LOCKED' : `ACQUIRING SIGNAL ${pct}%`}
      </div>
    </div>
  )
}

