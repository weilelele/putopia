'use client'

import { useState, useEffect } from 'react'
import type { McFunction, McFunctionStatus } from '@/types/database'

const STATUS_META: Record<McFunctionStatus, { label: string; color: string }> = {
  active:         { label: 'ACTIVE', color: '#20D890' },
  in_development: { label: 'DEV',    color: '#E35205' },
  unknown:        { label: '???',    color: 'rgba(245,245,245,0.35)' },
}

/**
 * Staggered "boot flicker" reveal — once `start` is true, reveals one entry at a
 * time. Returns the index revealed so far (-1 until the scan begins).
 */
function useFnAnimation(count: number, start: boolean) {
  const [readyIdx, setReadyIdx] = useState(-1)

  useEffect(() => {
    if (!start) return
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 0; i < count; i++) {
      timers.push(setTimeout(() => setReadyIdx(i), 400 + i * 240))
    }
    return () => timers.forEach(clearTimeout)
  }, [count, start])

  return { readyIdx }
}

/**
 * Multiverse Console showcase panel: device-desk.png image + CONFIRMED FUNCTIONS.
 * The functions module isn't present at all until the visitor taps the device
 * image — then the whole module slides in and its entries scan in one at a time.
 * Shared by the guest console hero / device archive.
 */
export function McConsolePanel({ mcFunctions }: { mcFunctions: McFunction[] }) {
  const [started, setStarted] = useState(false)
  const { readyIdx } = useFnAnimation(mcFunctions.length, started)

  return (
    <div className={`mc-console-panel${started ? ' mc-console-panel--started' : ''}`}>
      <style>{`@keyframes mcScanHint{0%,100%{opacity:0.55}50%{opacity:1}}@keyframes mcModuleIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Section divider title — matches the "INTERNAL UPDATES" feed divider */}
      <div className="mc-console-panel__title">
        <div className="mc-console-panel__title-line" />
        <span className="mc-console-panel__title-label">MULTIVERSE CONSOLE</span>
      </div>

      {/* Content: image only until tapped; the functions module appears after. */}
      <div className={`mc-console-panel__grid${started ? ' mc-console-panel__grid--split' : ''}`}>
        {/* Device image — tap to scan */}
        <button
          type="button"
          onClick={() => setStarted(true)}
          aria-label={started ? 'Multiverse Console' : 'Tap to scan the device functions'}
          aria-pressed={started}
          className="mc-console-panel__media"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/device-console.jpg" alt="Multiverse Console" className="mc-console-panel__image" />
        </button>

        {/* Confirmed functions — the whole module appears only after the tap */}
        {started && (
          <div className="mc-console-panel__functions">
            {/* Section label */}
            <div className="mc-console-panel__function-head">
              CONFIRMED FUNCTIONS
            </div>

            {/* Function rows — revealed one by one */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {mcFunctions.length > 0 ? mcFunctions.map((fn, i) => {
                const meta = STATUS_META[fn.status]
                const visible = i <= readyIdx
                return (
                  <div key={fn.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0', borderBottom: '1px solid #0D1220',
                    opacity: visible ? 1 : 0,
                    animation: visible ? 'fnFlicker 0.55s ease-out forwards' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: visible ? meta.color : 'rgba(227,82,5,0.28)',
                        boxShadow: visible ? `0 0 7px ${meta.color}` : 'none',
                        flexShrink: 0, display: 'inline-block',
                        transition: 'background 0.3s, box-shadow 0.3s',
                      }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)', letterSpacing: '0.02em' }}>
                        {fn.name}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color: meta.color, opacity: 0.9 }}>
                      {meta.label}
                    </span>
                  </div>
                )
              }) : (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #0D1220', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#151E30', flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: '#1A2438' }}>——————————</span>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{ marginTop: '14px', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: '#283048', letterSpacing: '0.16em', textAlign: 'right' }}>
              + MORE FUNCTIONS UNDER ACTIVE RESEARCH
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
