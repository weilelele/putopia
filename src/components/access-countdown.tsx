'use client'

import { useEffect, useState } from 'react'
import { VISIBLE_SECONDS, getRemainingSeconds } from '@/lib/access-window'

function fmt(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Quiet 10-minute viewing countdown, pinned to the right edge of the viewport
 * (design "style A"). A vertical rail with an orange fill (= time remaining,
 * anchored at the top) and a single white notch marker at the fill boundary.
 * Deliberately low-key — an ambient ritual timer, not a sales clock.
 *
 * Reads the remaining time from the shared access window each tick, so a refresh
 * keeps counting from where it was. Calls `onExpire` once when it hits zero.
 */
export function AccessCountdown({ onExpire }: { onExpire?: () => void }) {
  const [remaining, setRemaining] = useState(() => getRemainingSeconds())

  useEffect(() => {
    let fired = false
    const tick = () => {
      const r = getRemainingSeconds()
      setRemaining(r)
      if (r <= 0 && !fired) {
        fired = true
        onExpire?.()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [onExpire])

  const pct = Math.max(0, Math.min(1, remaining / VISIBLE_SECONDS))

  return (
    <div
      role="timer"
      aria-label={`Viewing window: ${fmt(remaining)} remaining`}
      style={{
        position: 'fixed',
        top: '50%',
        right: 'max(8px, env(safe-area-inset-right))',
        transform: 'translateY(-50%)',
        height: 'min(46vh, 320px)',
        width: 22,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          writingMode: 'vertical-rl',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-caption)',
          color: 'var(--color-nucleus)',
          letterSpacing: '1px',
          marginBottom: 8,
        }}
      >
        {fmt(remaining)}
      </div>
      <div
        style={{
          position: 'relative',
          flex: 1,
          width: 4,
          background: 'rgba(245,245,245,0.10)',
          borderRadius: 2,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: `${pct * 100}%`,
            background: 'var(--color-nucleus)',
            borderRadius: 2,
            transition: 'height 1s linear',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: `${pct * 100}%`,
            left: -4,
            right: -4,
            height: 2,
            background: 'var(--color-star)',
            transition: 'top 1s linear',
          }}
        />
      </div>
    </div>
  )
}
