'use client'

import { useState, useEffect } from 'react'
import type { McFunction, McFunctionStatus } from '@/types/database'

const STATUS_META: Record<McFunctionStatus, { label: string; color: string }> = {
  active:         { label: 'ACTIVE', color: '#20D890' },
  in_development: { label: 'DEV',    color: '#FF6B35' },
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
      timers.push(setTimeout(() => setReadyIdx(i), 250 + i * 240))
    }
    return () => timers.forEach(clearTimeout)
  }, [count, start])

  return { readyIdx }
}

/**
 * Multiverse Console showcase panel: device-desk.png image + CONFIRMED FUNCTIONS.
 * The functions stay hidden until the visitor taps the device image — then they
 * scan in one entry at a time. Shared by the guest console hero / device archive.
 */
export function McConsolePanel({ mcFunctions }: { mcFunctions: McFunction[] }) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  )
  const [started, setStarted] = useState(false)
  const { readyIdx } = useFnAnimation(mcFunctions.length, started)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', border: '1px solid rgba(255,107,53,0.16)', background: '#0F1430', overflow: 'hidden' }}>
      <style>{`@keyframes mcScanHint{0%,100%{opacity:0.55}50%{opacity:1}}`}</style>

      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#090D1A', borderBottom: '1px solid rgba(255,107,53,0.16)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'var(--color-nebula)' }}>{'// MULTIVERSE CONSOLE'}</span>
      </div>

      {/* Content: image left, functions right — stacked on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
        {/* Device image — tap to scan */}
        <button
          type="button"
          onClick={() => setStarted(true)}
          aria-label={started ? 'Multiverse Console' : 'Tap to scan the device functions'}
          style={{
            position: 'relative',
            display: 'block',
            width: '100%',
            padding: 0,
            border: 'none',
            background: 'none',
            cursor: started ? 'default' : 'pointer',
            borderRight: isMobile ? 'none' : '1px solid rgba(255,107,53,0.16)',
            borderBottom: isMobile ? '1px solid rgba(255,107,53,0.16)' : 'none',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/device-desk.png" alt="Multiverse Console" style={{ width: '100%', height: 'auto', display: 'block' }} />
          {!started && (
            <span
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 12,
                transform: 'translateX(-50%)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--fs-caption)',
                letterSpacing: '0.2em',
                color: 'var(--color-nucleus)',
                background: 'rgba(9,13,26,0.78)',
                border: '1px solid rgba(255,107,53,0.4)',
                padding: '5px 12px',
                whiteSpace: 'nowrap',
                animation: 'mcScanHint 1.8s ease-in-out infinite',
              }}
            >
              ▶ TAP TO SCAN FUNCTIONS
            </span>
          )}
        </button>

        {/* Confirmed functions */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', minHeight: isMobile ? 'auto' : '260px', position: 'relative' }}>
          {/* Section label */}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.28em', color: 'rgba(245,245,245,0.35)', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,107,53,0.16)' }}>
            CONFIRMED FUNCTIONS
          </div>

          {/* Function rows — revealed one by one after the scan starts */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {started && mcFunctions.length > 0 ? mcFunctions.map((fn, i) => {
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
                      background: visible ? meta.color : 'rgba(255,107,53,0.28)',
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
      </div>
    </div>
  )
}
