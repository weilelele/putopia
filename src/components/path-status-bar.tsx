'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { getDispatchDashboard } from '@/lib/actions/signal-tasks'
import type { DispatchDashboard } from '@/lib/actions/signal-tasks'

/**
 * Identity status bar + Signal Dispatch board, merged into one HUD module.
 * Top row: avatar / identity / device status. Bottom row: the focal-number
 * dispatch board (doc 4.1). Shown to logged-in users only.
 */
export function PathStatusBar({
  user, onDeviceClick, deviceDays = 0,
}: {
  user: { role: string; name?: string; email?: string; avatarUrl?: string | null }
  onDeviceClick: () => void
  /** Days the user has held a Multiverse Console (0 = none assigned). */
  deviceDays?: number
}) {
  const isApplicant = user.role === 'applicant'
  const isArchitect = user.role === 'architect'

  const idColor = isApplicant ? '#E8A020' : isArchitect ? '#FF6B35' : '#FFB07A'
  const idLabel = isApplicant ? 'APPLICANT' : isArchitect ? 'ARCHITECT' : 'VOYAGER'
  const showNudge = user.role === 'voyager' && !user.avatarUrl

  const name = user.name || user.email?.split('@')[0] || 'Voyager'
  const initials = name.slice(0, 2).toUpperCase()
  const hasDevice = deviceDays > 0

  const [board, setBoard] = useState<DispatchDashboard | null>(null)
  useEffect(() => { getDispatchDashboard().then(setBoard) }, [])

  const cell: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '11px 13px', textDecoration: 'none',
    fontFamily: 'var(--font-mono)', cursor: 'pointer',
    background: 'transparent', border: 'none',
    transition: 'background 0.15s',
  }
  const hov = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = 'rgba(255,107,53,0.05)' },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = 'transparent' },
  }
  const diagTop = (
    <div style={{ width: 16, alignSelf: 'stretch', position: 'relative', flex: '0 0 auto' }}>
      <div style={{ position: 'absolute', top: '10%', bottom: '10%', left: 'calc(50% + 4px)', width: 1, background: 'rgba(255,107,53,0.22)', transform: 'skewX(-22deg)' }} />
    </div>
  )
  const diagBottom = (
    <div style={{ width: 16, alignSelf: 'stretch', position: 'relative', flex: '0 0 auto' }}>
      <div style={{ position: 'absolute', top: '10%', bottom: '10%', left: '50%', width: 1, background: 'rgba(255,107,53,0.22)', transform: 'skewX(-22deg)' }} />
    </div>
  )

  return (
    <div style={{
      width: '100%', maxWidth: 560, margin: '0 auto',
      display: 'flex', flexDirection: 'column',
      padding: 0, background: 'var(--color-void)',
      borderRadius: 3, overflow: 'hidden',
    }}>
      {/* ── Identity row ── */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <Link href="/profile" title="Edit your profile" style={{ ...cell, flex: '0 0 auto' }} {...hov}
          onClick={() => posthog.capture('pathbar_avatar_clicked', { role: user.role })}
        >
          <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '1.5px solid rgba(255,138,92,0.4)' }} />
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${idColor}66`, background: '#0A0D1A', fontSize: 12, fontWeight: 700, color: idColor, letterSpacing: '0.02em' }}>
                {initials}
              </span>
            )}
            {showNudge && (
              <span style={{ position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: '50%', background: '#E83030', border: '1.5px solid var(--color-void)', boxShadow: '0 0 6px rgba(232,48,48,0.8)', animation: 'pathbar-pulse 1.8s ease-in-out infinite' }} />
            )}
          </span>
        </Link>

        {diagTop}

        <Link href="/voyager-path" title="View your path" style={{ ...cell, flex: 1, minWidth: 0 }} {...hov}
          onClick={() => posthog.capture('pathbar_view_path_clicked', { role: user.role })}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: idColor, boxShadow: `0 0 6px ${idColor}`, flexShrink: 0 }} />
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.25 }}>
            <span style={{ fontSize: 'var(--fs-label)', color: idColor, letterSpacing: '0.14em', fontWeight: 700, whiteSpace: 'nowrap' }}>{idLabel}</span>
            <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)', letterSpacing: '0.08em', marginTop: 3, whiteSpace: 'nowrap' }}>VIEW YOUR PATH</span>
          </span>
        </Link>
      </div>

      {/* ── Bottom row: Signal Dispatch (left) + device days (right), split 50/50 ── */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Left half — Signal Dispatch focal number. Wider than the right half so
            the "// SIGNAL DISPATCH" label + number never overrun the slash. */}
        <Link href="/signal" style={{ ...cell, flex: '1.7 1 0', minWidth: 0, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 4 }} {...hov}
          onClick={() => posthog.capture('pathbar_signal_clicked', { role: user.role, awaiting_you: board?.awaitingYou ?? null })}
        >
          <span style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.14em', color: '#E85D04', whiteSpace: 'nowrap' }}>{'// SIGNAL DISPATCH'}</span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
            <span style={{ fontSize: 42, color: '#FF6B35', lineHeight: 0.85 }}>{board ? board.awaitingYou : '—'}</span>
            <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-star)', whiteSpace: 'nowrap' }}>awaiting you</span>
          </span>
        </Link>

        {diagBottom}

        {/* Right half — device days; clicking opens the device modal */}
        <button onClick={() => { posthog.capture('pathbar_device_clicked', { role: user.role, has_device: hasDevice, device_days: deviceDays }); onDeviceClick() }} title={hasDevice ? `Device held ${deviceDays}d` : 'No device assigned'} style={{ ...cell, flex: '1 1 0', minWidth: 0, gap: 11 }} {...hov}>
          <span aria-label={hasDevice ? 'Device active' : 'No device'} style={{
            display: 'inline-block', width: 54, height: 32, flexShrink: 0,
            background: hasDevice ? '#20D890' : 'rgba(245,245,245,0.4)',
            WebkitMaskImage: 'url(/assets/vi-icon.png)', maskImage: 'url(/assets/vi-icon.png)',
            WebkitMaskSize: 'contain', maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center', maskPosition: 'center',
            filter: hasDevice ? 'drop-shadow(0 0 5px rgba(32,216,144,0.5))' : 'none',
          }} />
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: hasDevice ? '#20D890' : 'rgba(245,245,245,0.5)' }}>{deviceDays}</span>
            <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)', letterSpacing: '0.08em' }}>{deviceDays === 1 ? 'DAY' : 'DAYS'}</span>
          </span>
        </button>
      </div>

      <style>{`
        @keyframes pathbar-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.25); opacity: 0.7; } }
      `}</style>
    </div>
  )
}

