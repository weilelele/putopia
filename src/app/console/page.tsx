'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { useAuth } from '@/lib/auth-context'
import { getAllDevices } from '@/lib/actions/devices'
import { getPublicIntel } from '@/lib/actions/intel'
import { getLatestFeed } from '@/lib/actions/dashboard-feed'
import { getAllVotes, getVoteResultsBulk, getMyVoteResponses } from '@/lib/actions/votes'
import { getAllWorlds } from '@/lib/actions/worlds'
import { getMcFunctions } from '@/lib/actions/mc-functions'
import { CommsFeed } from '@/components/comms-feed'
import { VoteCard } from '@/components/VoteCard'
import { SectionTracker } from '@/components/section-tracker'
import { FlipWordmark } from '@/components/flip-wordmark'
import type { Device, Intel, Vote, World, McFunction, McFunctionStatus } from '@/types/database'
import type { FeedLine } from '@/lib/actions/dashboard-feed'

const STATUS_META: Record<McFunctionStatus, { label: string; color: string }> = {
  active:         { label: 'ACTIVE', color: '#22D890' },
  in_development: { label: 'DEV',    color: '#FF5A1F' },
  unknown:        { label: '???',    color: '#4A5570' },
}


const STATUS_STYLES = {
  available:    { color: '#20D890', border: 'rgba(32,216,144,0.3)' },
  needs_repair: { color: '#E83030', border: 'rgba(232,48,48,0.3)' },
  in_use:       { color: '#E85A00', border: 'rgba(232,90,0,0.3)' },
  unknown:      { color: '#4A5570', border: 'rgba(255,107,53,0.16)' },
}

const STATUS_LABELS: Record<string, string> = {
  available:    'AVAILABLE',
  needs_repair: 'NEEDS REPAIR',
  in_use:       'IN USE',
  unknown:      'UNKNOWN',
}

const TAG_COLOR: Record<string, string> = {
  NOTICE: 'var(--color-star-dim)',
  DEVICE: 'var(--color-nucleus)',
  ORG:    'var(--color-nebula)',
}

const BRAND_FILTER = 'grayscale(0.6) sepia(1) saturate(2.2) hue-rotate(-20deg) brightness(0.82)'

function DevicePlaceholder({ id }: { id: string }) {
  const seed = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const hue1 = (seed * 37) % 360
  const hue2 = (seed * 79) % 360
  const cx = 60 + (seed % 40)
  const cy = 60 + ((seed * 3) % 40)
  const r1 = 30 + (seed % 20)
  const r2 = 15 + (seed % 15)
  const lineX = 20 + (seed % 100)
  return (
    <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <rect width="160" height="120" fill="#0D1020" />
      {[20, 40, 60, 80, 100, 120, 140].map((x) => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="120" stroke="rgba(255,107,53,0.16)" strokeWidth="0.5" opacity="0.5" />
      ))}
      {[20, 40, 60, 80, 100].map((y) => (
        <line key={`h${y}`} x1="0" y1={y} x2="160" y2={y} stroke="rgba(255,107,53,0.16)" strokeWidth="0.5" opacity="0.5" />
      ))}
      <circle cx={cx} cy={cy} r={r1} fill="none" stroke={`hsl(${hue1},60%,45%)`} strokeWidth="1" opacity="0.6" />
      <circle cx={cx} cy={cy} r={r2} fill="none" stroke={`hsl(${hue1},60%,55%)`} strokeWidth="0.8" opacity="0.5" />
      <circle cx={cx} cy={cy} r="4" fill={`hsl(${hue1},70%,50%)`} opacity="0.8" />
      <line x1={lineX} y1="10" x2={lineX + 20} y2="110" stroke={`hsl(${hue2},50%,40%)`} strokeWidth="1" opacity="0.4" />
      <line x1={cx - 15} y1={cy} x2={cx + 15} y2={cy} stroke="#E85A00" strokeWidth="0.8" opacity="0.5" />
      <line x1={cx} y1={cy - 15} x2={cx} y2={cy + 15} stroke="#E85A00" strokeWidth="0.8" opacity="0.5" />
      <path d="M5,5 L5,15 M5,5 L15,5" stroke="rgba(255,107,53,0.28)" strokeWidth="1.5" fill="none" />
      <path d="M155,5 L155,15 M155,5 L145,5" stroke="rgba(255,107,53,0.28)" strokeWidth="1.5" fill="none" />
      <path d="M5,115 L5,105 M5,115 L15,115" stroke="rgba(255,107,53,0.28)" strokeWidth="1.5" fill="none" />
      <path d="M155,115 L155,105 M155,115 L145,115" stroke="rgba(255,107,53,0.28)" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

function DevicePreviewCard({ device }: { device: Device }) {
  const statusKey = (device.status ?? 'unknown') as keyof typeof STATUS_STYLES
  const style = STATUS_STYLES[statusKey] ?? STATUS_STYLES.unknown

  return (
    <div
      style={{
        background: 'var(--color-void)',
        border: '1px solid var(--bd-faint)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ aspectRatio: '4/3', overflow: 'hidden', borderBottom: '1px solid var(--bd-faint)', background: '#0A0D18' }}>
        {device.image_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={device.image_path} alt={device.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <DevicePlaceholder id={device.id} />
        )}
      </div>
      <div style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', letterSpacing: '0.15em' }}>
              {device.id}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', fontWeight: 600, color: 'var(--color-star)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {device.name}
            </div>
          </div>
          {device.status && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', whiteSpace: 'nowrap', flexShrink: 0,
              color: style.color, border: `1px solid ${style.border}`, padding: '0.1rem 0.35rem',
            }}>
              {STATUS_LABELS[statusKey] ?? statusKey}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)' }}>
          <span>◎</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{device.location}</span>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: '#8A9AB5', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {device.description}
        </p>
        {device.status === 'in_use' && device.current_user_name && (
          <div style={{ marginTop: '0.25rem', padding: '0.2rem 0.5rem', border: '1px solid rgba(232,90,0,0.2)', background: 'rgba(232,90,0,0.04)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: '#8A9AB5' }}>
            <span style={{ color: '#4A5570' }}>IN USE: </span>{device.current_user_name}
          </div>
        )}
      </div>
    </div>
  )
}

function IntelPreviewCard({ entry }: { entry: Intel }) {
  const color = TAG_COLOR[entry.tag] ?? 'var(--color-star-dim)'
  const hasImage = (entry.images?.length ?? 0) > 0

  return (
    <Link
      href={`/intel/${entry.id}`}
      className="block transition-all duration-150"
      style={{
        background: 'var(--color-void)', border: '1px solid var(--bd-faint)',
        borderLeft: `3px solid ${color}`, overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--color-void-2)'
        ;(e.currentTarget as HTMLElement).style.borderColor = color
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--color-void)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--bd-faint)'
      }}
    >
      {hasImage && (
        <div style={{ width: '100%', aspectRatio: '16/7', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={entry.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: BRAND_FILTER, display: 'block' }} />
        </div>
      )}
      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <span className="label-tag" style={{ color }}>{entry.tag}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', letterSpacing: '0.15em' }}>
            {new Date(entry.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
          </span>
        </div>
        <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--fs-body)', color: 'var(--color-star)', marginBottom: '0.4rem', lineHeight: 1.4 }}>
          {entry.title}
        </h3>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)', lineHeight: 1.6 }}>
          {entry.content.length > 120 ? entry.content.slice(0, 120) + '…' : entry.content}
        </p>
        <div style={{ marginTop: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color, opacity: 0.7 }}>
          READ MORE →
        </div>
      </div>
    </Link>
  )
}

/* ─── World Preview Card ─────────────────────────────────── */
function WorldPreviewCard({ world }: { world: World }) {
  const hasImage = !!world.image_path
  const displayName = world.name_en || world.name
  const showAltName = false

  return (
    <Link href={`/worlds/${encodeURIComponent(world.id)}`} style={{ display: 'block', overflow: 'hidden', textDecoration: 'none' }}>
      {/* Gradient / image header */}
      <div style={{ height: 110, position: 'relative', overflow: 'hidden' }}>
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={world.image_path!} alt={world.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${world.gradient_from}, ${world.gradient_to})` }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(17,21,37,0.85) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)', opacity: 0.3 }} />
        <span style={{ position: 'absolute', top: 6, left: 8, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: '#4A5570', background: 'rgba(7,9,18,0.7)', padding: '1px 5px' }}>
          {world.id}
        </span>
        <span style={{ position: 'absolute', bottom: 8, right: 8, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', color: 'rgba(232,160,32,0.8)' }}>
          VIEW →
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: '0.65rem 0.75rem', background: '#111525', border: '1px solid rgba(255,107,53,0.16)', borderTop: 'none' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', fontWeight: 600, color: '#EDE8DE', marginBottom: 6 }}>
          {displayName}
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: '#8A9AB5', lineHeight: 1.55, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {world.description}
        </p>
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,107,53,0.16)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: '#8A9AB5' }}>{world.discoverer_name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: '#4A5570' }}>{world.discovery_date}</span>
        </div>
      </div>
    </Link>
  )
}

/* ─── Guest Hero — Open Broadcast ──────────────────────── */
const HERO_LINES = [
  { delay: 80 },   // channel label
  { delay: 400 },  // "WELCOME, GUEST."
  { delay: 900 },  // paragraph 1
  { delay: 1500 }, // paragraph 2
  { delay: 2200 }, // italic sign-off
]

function useFnAnimation(count: number) {
  const [readyIdx, setReadyIdx] = useState(-1)

  useEffect(() => {
    setReadyIdx(-1)
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 0; i < count; i++) {
      timers.push(setTimeout(() => setReadyIdx(i), 300 + i * 160))
    }
    return () => timers.forEach(clearTimeout)
  }, [count])

  return { readyIdx }
}

function GuestHero({ feedLines, newHref, mcFunctions }: { feedLines: FeedLine[]; newHref: string; mcFunctions: McFunction[] }) {
  const [shown, setShown] = useState(HERO_LINES.map(() => false))
  const [isMobile, setIsMobile] = useState(false)

  const { readyIdx } = useFnAnimation(mcFunctions.length)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const timers = HERO_LINES.map(({ delay }, i) =>
      setTimeout(() => setShown(prev => { const n = [...prev]; n[i] = true; return n }), delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  const line = (i: number): React.CSSProperties => ({
    opacity:   shown[i] ? 1 : 0,
    transform: shown[i] ? 'translateY(0)' : 'translateY(10px)',
    transition: 'opacity 0.55s ease, transform 0.55s ease',
  })

  return (
    <section className="hero">
      {/* Brand wordmark — split-flap flip → spread to official lockup */}
      <div
        style={{
          width: '100%',
          textAlign: 'center',
          margin: '0 0 1.75rem',
          filter: 'drop-shadow(0 0 32px rgba(255,107,53,0.45)) drop-shadow(0 0 64px rgba(255,107,53,0.18))',
          ...line(0),
        }}
      >
        <FlipWordmark maxWidth={560} fill={0.78} />
      </div>

      {/* Emblem + tagline */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2rem', ...line(0) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/vi-icon.png"
          alt="Multiverse Collective"
          style={{
            width: '165px', height: 'auto', display: 'block',
            filter: 'drop-shadow(0 0 16px rgba(255,107,53,0.4)) drop-shadow(0 0 32px rgba(255,107,53,0.15))',
          }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', letterSpacing: '0.34em', color: 'var(--color-star-dim)' }}>
          EXPLORE PARALLEL WORLDS
        </span>
      </div>

      {/* Greeting + narrative — each line reveals in sequence */}
      <div style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1.1rem', textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 'var(--fs-h2)', letterSpacing: '0.12em',
          color: 'var(--color-star)', ...line(1),
        }}>
          WELCOME, GUEST.
        </div>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 'var(--fs-body)',
          lineHeight: 1.85, color: 'var(--color-star-dim)', margin: 0, ...line(2),
        }}>
          Whether by accident or design — you've found your way into the internal network of the Multiverse Collective.
        </p>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 'var(--fs-body)',
          lineHeight: 1.85, color: 'var(--color-star-dim)', margin: 0, ...line(3),
        }}>
          Here you will find our latest dispatches, and our most enigmatic instrument —{' '}
          <span style={{ color: 'var(--color-nebula)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)' }}>Multiverse Console</span>
          {' '}— a device built to reach into parallel worlds and observe what lies beyond.
        </p>
      </div>

      {/* MC Unit panel — full width */}
      <div style={{ width: '100%', maxWidth: '900px', margin: '1.75rem auto 0', border: '1px solid rgba(255,107,53,0.16)', background: '#0D1020', overflow: 'hidden' }}>
        {/* Header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#090D1A', borderBottom: '1px solid rgba(255,107,53,0.16)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'var(--color-nebula)' }}>// MULTIVERSE CONSOLE</span>
        </div>

        {/* Content: image left, functions right — stacked on mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
          {/* Device image */}
          <div style={{ borderRight: isMobile ? 'none' : '1px solid rgba(255,107,53,0.16)', borderBottom: isMobile ? '1px solid rgba(255,107,53,0.16)' : 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/device-desk.png" alt="Multiverse Console" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>

          {/* Confirmed functions */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', minHeight: isMobile ? 'auto' : '260px', position: 'relative' }}>
            {/* Section label */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.28em', color: '#4A5570', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,107,53,0.16)' }}>
              CONFIRMED FUNCTIONS
            </div>

            {/* Function rows — flicker boot sequence */}
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

      {/* CTA row — always horizontal, equal-width buttons */}
      <div style={{
        display: 'flex', gap: '1rem', marginTop: '1.25rem',
        width: '100%', maxWidth: '620px',
      }}>
        <Link href={newHref} className="btn-primary" style={{ flex: '1 1 0', minWidth: 0, justifyContent: 'center', padding: '1rem 1.5rem' }}
          onClick={() => posthog.capture('workspace_request_access_clicked')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
            <path d="M12 3 L13.2 10.8 L21 12 L13.2 13.2 L12 21 L10.8 13.2 L3 12 L10.8 10.8 Z" stroke="currentColor" strokeWidth="1.4" fill="rgba(255,255,255,0.25)" strokeLinejoin="round" />
          </svg>
          REQUEST ACCESS
        </Link>
        <Link href="/login" className="btn-secondary" style={{ flex: '1 1 0', minWidth: 0, justifyContent: 'center', padding: '1rem 1.5rem' }}
          onClick={() => posthog.capture('workspace_login_clicked')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="10 17 15 12 10 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          LOGIN
        </Link>
      </div>
    </section>
  )
}

/* ─── Auth Hero — Welcome Voyager ──────────────────────── */
function AuthHero({ user, feedLines }: { user: { role: string; name?: string }; feedLines: FeedLine[] }) {
  const isApplicant = user.role === 'applicant'

  return (
    <section className="hero">
      <div className="eyebrow">WELCOME,</div>
      <h1 className="hero-title">
        <span className="sparkle sparkle-l">✦</span>
        VOYAGER
        <span className="sparkle sparkle-r">✦</span>
      </h1>
      <p className="hero-subtitle">
        YOU HAVE BEEN SELECTED TO EXPLORE<br />
        THE MYSTERIES OF PARALLEL WORLDS.
      </p>

      <div className="deco-diamond"><span /></div>

      {feedLines.length > 0 && (
        <div style={{ width: '100%', maxWidth: '480px', margin: '1.25rem auto 0' }}>
          <CommsFeed lines={feedLines} />
        </div>
      )}

      {/* Activate Voyager — shown to applicants who haven't been promoted yet */}
      {isApplicant && (
        <div className="cta-row">
          <Link href="/activate" className="btn-primary" style={{ padding: '1rem 2.25rem' }}
            onClick={() => posthog.capture('activate_voyager_clicked')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
              <path d="M12 3 L13.2 10.8 L21 12 L13.2 13.2 L12 21 L10.8 13.2 L3 12 L10.8 10.8 Z" stroke="currentColor" strokeWidth="1.4" fill="rgba(255,255,255,0.25)" strokeLinejoin="round" />
            </svg>
            ACTIVATE VOYAGER
          </Link>
        </div>
      )}
    </section>
  )
}

/* ─── Page ──────────────────────────────────────────────── */
export default function ConsolePage() {
  return <Suspense><ConsoleInner /></Suspense>
}

function ConsoleInner() {
  const { user, loading } = useAuth()
  const searchParams = useSearchParams()
  const utmTracked = useRef(false)

  useEffect(() => {
    if (utmTracked.current) return
    utmTracked.current = true
    const sp = new URLSearchParams(window.location.search)
    const utm_source = sp.get('utm_source')
    if (utm_source) {
      posthog.capture('console_page_viewed', {
        utm_source,
        utm_medium:           sp.get('utm_medium')   ?? undefined,
        utm_campaign:         sp.get('utm_campaign') ?? undefined,
        utm_content:          sp.get('utm_content')  ?? undefined,
        fbclid:               sp.get('fbclid')       ?? undefined,
        landing_page_variant: sp.get('variant')      ?? undefined,
      })
    }
  }, [])

  // Preserve UTM params when forwarding to /new
  const newHref = searchParams.toString() ? `/new?${searchParams.toString()}` : '/new'
  const [devices, setDevices] = useState<Device[]>([])
  const [latestIntel, setLatestIntel] = useState<Intel[]>([])
  const [feedLines, setFeedLines] = useState<FeedLine[]>([])
  const [latestVotes, setLatestVotes] = useState<Vote[]>([])
  const [voteTallies, setVoteTallies] = useState<Record<string, Record<string, number>>>({})
  const [myVoteResponses, setMyVoteResponses] = useState<{ vote_id: string; selected_options: string[] }[]>([])
  const [latestWorlds, setLatestWorlds] = useState<World[]>([])
  const [mcFunctions, setMcFunctions] = useState<McFunction[]>([])

  useEffect(() => {
    getAllDevices().then((d) => setDevices(d.filter((dev) => dev.knowledge === 'known').slice(0, 3)))
    getPublicIntel().then((intel) => setLatestIntel(intel.slice(0, 2)))
    getLatestFeed().then((f) => { if (f?.lines?.length) setFeedLines(f.lines) })
    getAllWorlds().then((w) => setLatestWorlds([...w].reverse().slice(0, 3)))
    getMcFunctions().then((fns) => setMcFunctions(fns as McFunction[]))
    getAllVotes().then(async (votes) => {
      const active = votes.filter((v) => v.is_active).slice(0, 2)
      setLatestVotes(active)
      if (active.length > 0) {
        const tallies = await getVoteResultsBulk(active.map((v) => v.id))
        setVoteTallies(tallies)
      }
    })
    getMyVoteResponses().then(setMyVoteResponses)
  }, [])

  const isGuest = !loading && user.role === 'guest'

  return (
    <div className="landing-main">
      <SectionTracker section="dashboard" />
      <div className="nebula-bg" />

      <div className="top-bar">
        <div className="crumbs">
          {isGuest
            ? <>PC://WORKSPACE <span>/</span> PUBLIC CHANNEL</>
            : <>PC://CONSOLE <span>/</span> DASHBOARD</>
          }
        </div>
        <div className="right">
          <div className="item">UTC <span className="val">{new Date().toISOString().slice(11, 19)}</span></div>
          <div className="item">UPLINK <span className="val">ACTIVE</span></div>
        </div>
      </div>

      {/* ── Hero: conditional on auth state ── */}
      {loading ? (
        <section className="hero" style={{ flex: 1 }} />
      ) : isGuest ? (
        <GuestHero feedLines={feedLines} newHref={newHref} mcFunctions={mcFunctions} />
      ) : (
        <AuthHero user={user} feedLines={feedLines} />
      )}

      {/* ── Known Devices ── */}
      {devices.length > 0 && (
        <section style={{ padding: '3rem 2.5rem 2rem' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.3em', color: 'var(--color-nucleus)' }}>
                KNOWN DEVICES
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {devices.map((device) => (
                <DevicePreviewCard key={device.id} device={device} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Latest Intel ── */}
      {latestIntel.length > 0 && (
        <section style={{ padding: '1rem 2.5rem 2rem' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.3em', color: 'var(--color-star-dim)' }}>
                LATEST INTEL
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {latestIntel.map((entry) => (
                <IntelPreviewCard key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Worlds ── */}
      {latestWorlds.length > 0 && (
        <section style={{ padding: '1rem 2.5rem 2rem' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.3em', color: 'var(--color-nebula)' }}>
                WORLD RECORDS
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              {latestWorlds.map((world) => (
                <WorldPreviewCard key={world.id} world={world} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Active Votes ── */}
      {latestVotes.length > 0 && (
        <section style={{ padding: '1rem 2.5rem 2rem' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.3em', color: '#20D890' }}>
                ● ACTIVE VOTES
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              {latestVotes.map((vote) => {
                const myResp = myVoteResponses.find((r) => r.vote_id === vote.id)
                return (
                  <VoteCard
                    key={vote.id}
                    vote={vote}
                    hasVoted={!!myResp}
                    mySelections={myResp?.selected_options ?? []}
                    tally={voteTallies[vote.id] ?? {}}
                  />
                )
              })}
            </div>
          </div>
        </section>
      )}

      <div className="footer-bar" style={{ marginTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>MULTIVERSE.COLLECTIVE</div>
      </div>
    </div>
  )
}
