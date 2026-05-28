'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { useAuth } from '@/lib/auth-context'
import { getAllDevices } from '@/lib/actions/devices'
import { getPublicIntel } from '@/lib/actions/intel'
import { getLatestFeed } from '@/lib/actions/dashboard-feed'
import { getAllVotes, getVoteResultsBulk, getMyVoteResponses } from '@/lib/actions/votes'
import { getAllWorlds } from '@/lib/actions/worlds'
import { CommsFeed } from '@/components/comms-feed'
import { VoteCard } from '@/components/VoteCard'
import { SectionTracker } from '@/components/section-tracker'
import type { Device, Intel, Vote, World } from '@/types/database'
import type { FeedLine } from '@/lib/actions/dashboard-feed'


const STATUS_STYLES = {
  available:    { color: '#20D890', border: 'rgba(32,216,144,0.3)' },
  needs_repair: { color: '#E83030', border: 'rgba(232,48,48,0.3)' },
  in_use:       { color: '#E85A00', border: 'rgba(232,90,0,0.3)' },
  unknown:      { color: '#4A5570', border: '#1A2238' },
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
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="120" stroke="#1A2238" strokeWidth="0.5" opacity="0.5" />
      ))}
      {[20, 40, 60, 80, 100].map((y) => (
        <line key={`h${y}`} x1="0" y1={y} x2="160" y2={y} stroke="#1A2238" strokeWidth="0.5" opacity="0.5" />
      ))}
      <circle cx={cx} cy={cy} r={r1} fill="none" stroke={`hsl(${hue1},60%,45%)`} strokeWidth="1" opacity="0.6" />
      <circle cx={cx} cy={cy} r={r2} fill="none" stroke={`hsl(${hue1},60%,55%)`} strokeWidth="0.8" opacity="0.5" />
      <circle cx={cx} cy={cy} r="4" fill={`hsl(${hue1},70%,50%)`} opacity="0.8" />
      <line x1={lineX} y1="10" x2={lineX + 20} y2="110" stroke={`hsl(${hue2},50%,40%)`} strokeWidth="1" opacity="0.4" />
      <line x1={cx - 15} y1={cy} x2={cx + 15} y2={cy} stroke="#E85A00" strokeWidth="0.8" opacity="0.5" />
      <line x1={cx} y1={cy - 15} x2={cx} y2={cy + 15} stroke="#E85A00" strokeWidth="0.8" opacity="0.5" />
      <path d="M5,5 L5,15 M5,5 L15,5" stroke="#1E2840" strokeWidth="1.5" fill="none" />
      <path d="M155,5 L155,15 M155,5 L145,5" stroke="#1E2840" strokeWidth="1.5" fill="none" />
      <path d="M5,115 L5,105 M5,115 L15,115" stroke="#1E2840" strokeWidth="1.5" fill="none" />
      <path d="M155,115 L155,105 M155,115 L145,115" stroke="#1E2840" strokeWidth="1.5" fill="none" />
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
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--color-star-deep)', letterSpacing: '0.15em' }}>
              {device.id}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-star)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {device.name}
            </div>
          </div>
          {device.status && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', whiteSpace: 'nowrap', flexShrink: 0,
              color: style.color, border: `1px solid ${style.border}`, padding: '0.1rem 0.35rem',
            }}>
              {STATUS_LABELS[statusKey] ?? statusKey}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--color-star-deep)' }}>
          <span>◎</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{device.location}</span>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#8A9AB5', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {device.description}
        </p>
        {device.status === 'in_use' && device.current_user_name && (
          <div style={{ marginTop: '0.25rem', padding: '0.2rem 0.5rem', border: '1px solid rgba(232,90,0,0.2)', background: 'rgba(232,90,0,0.04)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#8A9AB5' }}>
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
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--color-star-deep)', letterSpacing: '0.15em' }}>
            {new Date(entry.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
          </span>
        </div>
        <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-star)', marginBottom: '0.4rem', lineHeight: 1.4 }}>
          {entry.title}
        </h3>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-star-dim)', lineHeight: 1.6 }}>
          {entry.content.length > 120 ? entry.content.slice(0, 120) + '…' : entry.content}
        </p>
        <div style={{ marginTop: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.18em', color, opacity: 0.7 }}>
          READ MORE →
        </div>
      </div>
    </Link>
  )
}

/* ─── World Preview Card ─────────────────────────────────── */
function WorldPreviewCard({ world }: { world: World }) {
  const hasImage = !!world.image_path
  const showAltName = world.name_en && world.name_en !== world.name

  return (
    <div style={{ display: 'block', overflow: 'hidden' }}>
      {/* Gradient / image header */}
      <div style={{ height: 80, position: 'relative', overflow: 'hidden' }}>
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={world.image_path!} alt={world.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${world.gradient_from}, ${world.gradient_to})` }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(17,21,37,0.85) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)', opacity: 0.3 }} />
        <span style={{ position: 'absolute', top: 6, left: 8, fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: '#4A5570', background: 'rgba(7,9,18,0.7)', padding: '1px 5px' }}>
          {world.id}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: '0.65rem 0.75rem', background: '#111525', border: '1px solid #1E2840', borderTop: 'none' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: '#EDE8DE', marginBottom: showAltName ? 2 : 6 }}>
          {world.name}
        </div>
        {showAltName && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: world.gradient_to, marginBottom: 6 }}>
            {world.name_en}
          </div>
        )}
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#8A9AB5', lineHeight: 1.55, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {world.description}
        </p>
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid #1A2238', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#8A9AB5' }}>{world.discoverer_name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#4A5570' }}>{world.discovery_date}</span>
        </div>
      </div>
    </div>
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

function GuestHero({ feedLines }: { feedLines: FeedLine[] }) {
  const [shown, setShown] = useState(HERO_LINES.map(() => false))

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
      {/* Channel label */}
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '2rem', ...line(0) }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', letterSpacing: '0.28em', color: 'var(--color-ok)' }}>
          ● OPEN TRANSMISSION
        </span>
        <span style={{ color: 'var(--color-star-deep)', fontFamily: 'var(--font-mono)', fontSize: '0.52rem' }}>/</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', letterSpacing: '0.28em', color: 'var(--color-star-deep)' }}>
          UNCLASSIFIED
        </span>
      </div>

      {/* Greeting + narrative — each line reveals in sequence */}
      <div style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1.1rem', textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 'clamp(1.1rem, 2.5vh, 1.5rem)', letterSpacing: '0.12em',
          color: 'var(--color-star)', ...line(1),
        }}>
          WELCOME, GUEST.
        </div>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 'clamp(0.85rem, 1.5vh, 0.97rem)',
          lineHeight: 1.85, color: 'var(--color-star-dim)', margin: 0, ...line(2),
        }}>
          Whether by accident or design — you've found your way into the internal network of the Multiverse Collective.
        </p>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 'clamp(0.85rem, 1.5vh, 0.97rem)',
          lineHeight: 1.85, color: 'var(--color-star-dim)', margin: 0, ...line(3),
        }}>
          Here you will find our latest dispatches, and our most enigmatic instrument —{' '}
          <span style={{ color: 'var(--color-nebula)', fontFamily: 'var(--font-mono)', fontSize: '0.88em' }}>Multiverse Console</span>
          {' '}— a device built to reach into parallel worlds and observe what lies beyond.
        </p>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 'clamp(0.8rem, 1.4vh, 0.9rem)',
          lineHeight: 1.8, color: 'rgba(242,240,230,0.4)', margin: 0, fontStyle: 'italic', ...line(4),
        }}>
          If you'd like to know more, you're welcome to apply.
        </p>
      </div>

      {/* CommsFeed — always rendered to avoid layout shift; key remounts when data arrives */}
      <div style={{ width: '100%', maxWidth: '480px', margin: '1.75rem auto 0' }}>
        <CommsFeed key={feedLines.length > 0 ? 'loaded' : 'empty'} lines={feedLines} />
      </div>

      <div className="cta-row" style={{ marginTop: '1.25rem' }}>
        <Link href="/new" className="cta" style={{ textDecoration: 'none', width: 'clamp(150px, 22vw, 220px)', height: 'clamp(44px, 5.5vh, 52px)' }}
          onClick={() => posthog.capture('workspace_request_access_clicked')}
        >
          <div className="cta-bg" />
          <div className="cta-frame" />
          <div className="cta-icon-slot" style={{ width: 'clamp(44px, 5.5vh, 52px)' }}>
            <div className="cta-icon-circle" style={{ width: 32, height: 32 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 3 L13.2 10.8 L21 12 L13.2 13.2 L12 21 L10.8 13.2 L3 12 L10.8 10.8 Z" stroke="currentColor" strokeWidth="1.4" fill="rgba(255,90,31,0.15)" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="cta-divider" />
          <div className="cta-label" style={{ fontSize: '0.62rem', letterSpacing: '0.18em' }}>REQUEST ACCESS</div>
        </Link>
        <Link href="/login" className="cta teal" style={{ textDecoration: 'none', width: 'clamp(120px, 16vw, 180px)', height: 'clamp(44px, 5.5vh, 52px)' }}
          onClick={() => posthog.capture('workspace_login_clicked')}
        >
          <div className="cta-bg" />
          <div className="cta-frame" />
          <div className="cta-icon-slot" style={{ width: 'clamp(44px, 5.5vh, 52px)' }}>
            <div className="cta-icon-circle" style={{ width: 32, height: 32 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="10 17 15 12 10 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div className="cta-divider" />
          <div className="cta-label" style={{ fontSize: '0.62rem', letterSpacing: '0.18em' }}>LOGIN</div>
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
          <Link href="/activate" className="cta" style={{ textDecoration: 'none' }}
            onClick={() => posthog.capture('activate_voyager_clicked')}
          >
            <div className="cta-bg" />
            <div className="cta-frame" />
            <div className="cta-icon-slot">
              <div className="cta-icon-circle">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 3 L13.2 10.8 L21 12 L13.2 13.2 L12 21 L10.8 13.2 L3 12 L10.8 10.8 Z" stroke="currentColor" strokeWidth="1.4" fill="rgba(255,90,31,0.15)" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div className="cta-divider" />
            <div className="cta-label">ACTIVATE VOYAGER</div>
          </Link>
        </div>
      )}
    </section>
  )
}

/* ─── Page ──────────────────────────────────────────────── */
export default function ConsolePage() {
  const { user, loading } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [latestIntel, setLatestIntel] = useState<Intel[]>([])
  const [feedLines, setFeedLines] = useState<FeedLine[]>([])
  const [latestVotes, setLatestVotes] = useState<Vote[]>([])
  const [voteTallies, setVoteTallies] = useState<Record<string, Record<string, number>>>({})
  const [myVoteResponses, setMyVoteResponses] = useState<{ vote_id: string; selected_options: string[] }[]>([])
  const [latestWorlds, setLatestWorlds] = useState<World[]>([])

  useEffect(() => {
    getAllDevices().then((d) => setDevices(d.filter((dev) => dev.knowledge === 'known').slice(0, 3)))
    getPublicIntel().then((intel) => setLatestIntel(intel.slice(0, 2)))
    getLatestFeed().then((f) => { if (f?.lines?.length) setFeedLines(f.lines) })
    getAllWorlds().then((w) => setLatestWorlds([...w].reverse().slice(0, 3)))
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
        <GuestHero feedLines={feedLines} />
      ) : (
        <AuthHero user={user} feedLines={feedLines} />
      )}

      {/* ── Known Devices ── */}
      {devices.length > 0 && (
        <section style={{ padding: '3rem 2.5rem 2rem' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.3em', color: 'var(--color-nucleus)' }}>
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
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.3em', color: 'var(--color-star-dim)' }}>
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
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.3em', color: 'var(--color-nebula)' }}>
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
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.3em', color: '#20D890' }}>
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
        <div>PUTOPIA.COLLECTIVE</div>
      </div>
    </div>
  )
}
