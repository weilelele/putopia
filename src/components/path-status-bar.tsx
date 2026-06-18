'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDispatchDashboard } from '@/lib/actions/signal-tasks'
import type { DispatchDashboard } from '@/lib/actions/signal-tasks'
import { WORLD_STAGE_META } from '@/types/database'
import type { WorldStage } from '@/types/database'

const STAGE_ORDER: WorldStage[] = ['tuning', 'raw', 'established']

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
  const [worldsOpen, setWorldsOpen] = useState(false)
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
  const divider = <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,107,53,0.14)' }} />

  // Right-side stat rows: number sits in a fixed-width right-aligned column so
  // the two numbers (and their labels) line up regardless of digit count.
  const statRow: React.CSSProperties = {
    display: 'flex', alignItems: 'baseline', gap: 8, textDecoration: 'none',
    fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)',
    cursor: 'pointer', textAlign: 'left', width: 'fit-content', whiteSpace: 'nowrap',
  }
  const statNum: React.CSSProperties = { display: 'inline-block', minWidth: '1.7em', textAlign: 'right' }

  return (
    <div className="hud-frame hud-frame--orange" style={{
      width: '100%', maxWidth: 560, margin: '0 auto',
      display: 'flex', flexDirection: 'column',
      padding: 0, background: 'var(--color-void)',
    }}>
      {/* ── Identity row ── */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <Link href="/profile" title="Edit your profile" style={{ ...cell, flex: '0 0 auto' }} {...hov}>
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

        {divider}

        <Link href="/voyager-path" title="View your path" style={{ ...cell, flex: 1, minWidth: 0 }} {...hov}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: idColor, boxShadow: `0 0 6px ${idColor}`, flexShrink: 0 }} />
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.25 }}>
            <span style={{ fontSize: 'var(--fs-label)', color: idColor, letterSpacing: '0.14em', fontWeight: 700, whiteSpace: 'nowrap' }}>{idLabel}</span>
            <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)', letterSpacing: '0.08em', marginTop: 3, whiteSpace: 'nowrap' }}>VIEW YOUR PATH</span>
          </span>
        </Link>

        {divider}

        <button onClick={onDeviceClick} title={hasDevice ? `Device held ${deviceDays}d` : 'No device assigned'} style={{ ...cell, flex: '0 0 auto', gap: 7 }} {...hov}>
          <span aria-label={hasDevice ? 'Device active' : 'No device'} style={{
            display: 'inline-block', width: 32, height: 19, flexShrink: 0,
            background: hasDevice ? '#20D890' : 'rgba(245,245,245,0.32)',
            WebkitMaskImage: 'url(/assets/vi-icon.png)', maskImage: 'url(/assets/vi-icon.png)',
            WebkitMaskSize: 'contain', maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center', maskPosition: 'center',
            filter: hasDevice ? 'drop-shadow(0 0 5px rgba(32,216,144,0.5))' : 'none',
          }} />
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: hasDevice ? '#20D890' : 'rgba(245,245,245,0.5)' }}>{deviceDays}</span>
            <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)', letterSpacing: '0.08em' }}>{deviceDays === 1 ? 'DAY' : 'DAYS'}</span>
          </span>
        </button>
      </div>

      {/* ── Signal Dispatch board (doc 4.1) ── */}
      {board && (
        <>
          <div style={{ height: 1, background: 'rgba(255,107,53,0.22)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', overflow: 'hidden' }}>
            <Link href="/signal" style={{ flex: '0 0 auto', textDecoration: 'none' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.22em', color: '#E85D04', marginBottom: 3 }}>{'// SIGNAL DISPATCH'}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 42, color: '#FF6B35', lineHeight: 0.85 }}>{board.awaitingYou}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star)' }}>awaiting you</span>
              </div>
            </Link>
            <div style={{ flex: 1, minWidth: 118, display: 'flex', flexDirection: 'column', gap: 7, borderLeft: '1px solid rgba(255,107,53,0.15)', paddingLeft: 12 }}>
              <Link href="/signal" className="disp-stat" style={statRow}>
                <b style={{ ...statNum, color: 'var(--color-star)' }}>{board.inTuning}</b>
                <span>in tuning</span>
              </Link>
              <button onClick={() => setWorldsOpen(true)} className="disp-stat" style={{ ...statRow, background: 'none', border: 'none', padding: 0 }}>
                <b style={{ ...statNum, color: '#20D890' }}>{board.yourWorlds.length}</b>
                <span>your worlds</span>
              </button>
            </div>
          </div>
        </>
      )}

      {worldsOpen && board && <YourWorldsModal worlds={board.yourWorlds} onClose={() => setWorldsOpen(false)} />}

      <style>{`
        @keyframes pathbar-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.25); opacity: 0.7; } }
        .disp-stat { transition: color 0.15s; }
        .disp-stat:hover { color: #F5F5F5; }
        .disp-stat:hover b { filter: brightness(1.25); }
      `}</style>
    </div>
  )
}

function YourWorldsModal({ worlds, onClose }: { worlds: DispatchDashboard['yourWorlds']; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(7,9,18,0.78)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#0F1430', border: '1px solid rgba(255,107,53,0.3)', maxWidth: 460, width: '100%', maxHeight: '80vh', overflowY: 'auto', padding: '24px 22px', position: 'relative', fontFamily: 'var(--font-mono)' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,245,245,0.4)', fontSize: 18 }}>✕</button>
        <div style={{ color: '#E85D04', fontSize: 'var(--fs-caption)', letterSpacing: '0.25em', marginBottom: 16 }}>{'// YOUR WORLDS'}</div>
        {worlds.length === 0 && (
          <div style={{ fontSize: 12, color: 'rgba(245,245,245,0.5)', lineHeight: 1.6 }}>
            You haven&apos;t started any worlds yet.
            <Link href="/worlds/submit" onClick={onClose} style={{ display: 'inline-block', marginTop: 10, color: '#E85D04', textDecoration: 'none' }}>Report a sighting →</Link>
          </div>
        )}
        {STAGE_ORDER.map((stage) => {
          const items = worlds.filter((w) => w.stage === stage)
          if (!items.length) return null
          return (
            <div key={stage} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color: 'rgba(245,245,245,0.4)', marginBottom: 7, textTransform: 'uppercase' }}>
                {WORLD_STAGE_META[stage].label} · {items.length}
              </div>
              {items.map((w) => (
                <Link key={w.id} href={`/worlds/${encodeURIComponent(w.id)}`} onClick={onClose} style={{ display: 'block', padding: '8px 10px', marginBottom: 4, background: '#070912', border: '1px solid rgba(255,107,53,0.12)', color: '#F5F5F5', fontSize: 'var(--fs-caption)', textDecoration: 'none' }}>
                  {w.name}
                </Link>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
