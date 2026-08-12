'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import posthog from 'posthog-js'
import { useAuth, type AuthUser } from '@/lib/auth-context'
import type { GuestHeroStats } from '@/lib/actions/hero-stats'
import { FeedProtoClient, type FeedEntry } from '@/app/feed-proto/feed-client'
import type { ExperimentGroup } from '@/lib/actions/experiment'
import { SectionTracker } from '@/components/section-tracker'
import SmartImage from '@/components/smart-image'
import { FlipWordmark } from '@/components/flip-wordmark'
import { McConsolePanel } from '@/components/mc-console-panel'
import { PathStatusBar } from '@/components/path-status-bar'
import { AccessGate } from '@/components/access-gate'
import { useActivateAccess } from '@/components/activate-action'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { ArchiveStatStrip } from '@/components/archive-stat-strip'
import type { McFunction } from '@/types/database'

// ─── Global sales gate — keep in sync with voyager-pack/page.tsx & api/checkout/route.ts ───
const SALES_OPEN = true

/* ─── Voyager Ad Slot — homepage promo block between Status Feed & Device Registry ───
 *  Both groups now land on the product page (/voyager-pack) on click; the
 *  task-completion gate for group B is enforced at the pack's buy button, not
 *  the ad slot. Group styling/copy still differs (A orange, B amber).
 *  A (direct)     → orange, "Initial Voyager Pack" → /voyager-pack (buy now)
 *  B (task_gated) → amber,  "Earn Your Status"     → /voyager-pack (gated at checkout)
 *  Hero photo fades top + bottom into the card; faint breathing glow. */
function VoyagerAdSlot({ group }: { group: ExperimentGroup }) {
  const direct = group === 'direct'
  const accent = direct ? '#E35205' : '#E8A020'
  const soft   = direct ? 'rgba(227,82,5,' : 'rgba(232,160,32,'   // append "<a>)"
  const eyebrow = direct ? 'VOYAGER INITIATION' : 'VOYAGER RECRUITMENT'
  const title   = direct ? 'INITIAL VOYAGER PACK' : 'EARN YOUR STATUS'
  const cta     = 'ACTIVATE'
  const href    = '/voyager-pack'

  return (
    <Link
      href={href}
      className={direct ? 'vp-ad vp-ad--direct' : 'vp-ad vp-ad--gated'}
      style={{
        display: 'flex', flexDirection: 'column', overflow: 'hidden', textDecoration: 'none',
        background: '#0F1430', border: `1px solid ${soft}0.55)`, position: 'relative',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = accent }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${soft}0.55)` }}
    >
      <style>{`
        @keyframes vp-breathe-o { 0%,100% { box-shadow: 0 0 16px rgba(227,82,5,0.22), 0 0 0 1px rgba(227,82,5,0.18); } 50% { box-shadow: 0 0 38px rgba(227,82,5,0.55), 0 0 70px rgba(227,82,5,0.18), 0 0 0 1px rgba(227,82,5,0.45); } }
        @keyframes vp-breathe-a { 0%,100% { box-shadow: 0 0 16px rgba(232,160,32,0.22), 0 0 0 1px rgba(232,160,32,0.18); } 50% { box-shadow: 0 0 38px rgba(232,160,32,0.52), 0 0 70px rgba(232,160,32,0.16), 0 0 0 1px rgba(232,160,32,0.42); } }
        .vp-ad--direct { animation: vp-breathe-o 3.6s ease-in-out infinite; }
        .vp-ad--gated  { animation: vp-breathe-a 3.6s ease-in-out infinite; }
      `}</style>

      {/* Hero photo — bleeds with a top + bottom fade into the card */}
      <div style={{ position: 'relative', height: 150, overflow: 'hidden', background: '#070A1A' }}>
        <SmartImage
          src="/voyager-pack/voyager-hero.png"
          alt={title}
          sizes="(min-width: 768px) 420px, 100vw"
          quality={60}
          style={{
            objectFit: 'cover', objectPosition: '50% 66%',
            filter: direct
              ? 'saturate(0.9) brightness(0.74)'
              : 'saturate(0.6) brightness(0.72) sepia(0.35) hue-rotate(-18deg)',
          }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        {/* scan lines */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${soft}0.035) 3px, ${soft}0.035) 4px)` }} />
        {/* top + bottom fade into the card body */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, #0F1430 0%, rgba(15,20,48,0) 22%, rgba(15,20,48,0) 58%, #0F1430 100%)' }} />
        {/* corner bracket */}
        <div style={{ position: 'absolute', top: 8, left: 8, width: 16, height: 16,
          borderTop: `1.5px solid ${soft}0.7)`, borderLeft: `1.5px solid ${soft}0.7)` }} />
      </div>

      {/* Info — eyebrow / title / CTA */}
      <div style={{ padding: '0.7rem 0.9rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: accent, letterSpacing: '0.15em' }}>
            {eyebrow}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(1rem, 3.5vw, 1.15rem)', fontWeight: 700, color: 'var(--color-star)', letterSpacing: '0.06em', lineHeight: 1.2 }}>
            {title}
          </div>
        </div>

        <div style={{
          textAlign: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', fontWeight: 700, letterSpacing: '0.22em',
          color: '#070912', background: accent, padding: '0.6rem',
        }}>
          [ {cta} ]
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

/* ─── Three headline numbers (guest hero) — tap a number to reveal copy ── */
type HeroStatKey = 'worlds' | 'devices' | 'voyagers'

const HERO_STAT_INFO: Record<HeroStatKey, string> = {
  worlds:
    'The parallel worlds recorded by the Collective, including those imagined by its members, as well as those now being stably observed via the Multiverse Console.',
  devices:
    'The number of Multiverse Consoles currently collected, deployed, or undergoing repairs by the Collective. It is expected to continue growing steadily.',
  voyagers:
    'Official voyagers and architects of the Collective, plus the applicants currently in line for a Multiverse Console.',
}

// Voyager headcount is shown scaled up by this factor (rounded up) so the
// public number reflects reach rather than raw registered rows. Tune here.
const VOYAGER_DISPLAY_MULTIPLIER = 1.7

function HeroStats({ worlds, voyagers }: { worlds: number | null; voyagers: number | null }) {
  const [active, setActive] = useState<HeroStatKey | null>(null)

  const voyagerDisplay = voyagers == null ? '—' : String(Math.ceil(voyagers * VOYAGER_DISPLAY_MULTIPLIER))

  const items: { key: HeroStatKey; value: string; label: string }[] = [
    { key: 'worlds',   value: worlds == null ? '—' : String(worlds), label: 'PARALLEL WORLDS' },
    { key: 'devices',  value: '?',                                    label: 'DEVICES' },
    { key: 'voyagers', value: voyagerDisplay,                         label: 'VOYAGERS' },
  ]

  return (
    <div style={{ width: '100%', maxWidth: '540px', margin: '1.75rem auto 0' }}>
      <ArchiveStatStrip items={items.map(({ key, label, value }) => ({
        expanded: active === key,
        label,
        value,
        onSelect: () => setActive((prev) => (prev === key ? null : key)),
      }))} />

      {active && (
        <ArchiveCard className="archive-stat-description">
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', lineHeight: 1.75, color: 'var(--color-star-dim)' }}>
            {HERO_STAT_INFO[active]}
          </p>
        </ArchiveCard>
      )}
    </div>
  )
}

function GuestHero({ newHref, stats, mcFunctions }: { newHref: string; stats: GuestHeroStats | null; mcFunctions: McFunction[] }) {
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

  // Same "get full access" rule as the gate: returning emailers get the inbox
  // popup; cold visitors go to onboarding.
  const { trigger: requestAccess, modal: requestAccessModal } = useActivateAccess(newHref)

  return (
    <section className="hero">
      {/* Brand wordmark — split-flap flip → spread to official lockup */}
      <div
        style={{
          width: '100%',
          textAlign: 'center',
          margin: 'clamp(1.25rem, 5vh, 3rem) 0 1.75rem',
          ...line(0),
        }}
      >
        <FlipWordmark maxWidth={616} fill={0.858} />
      </div>

      {/* Emblem */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem', ...line(0) }}>
        <SmartImage
          src="/assets/vi-icon.png"
          alt="Multiverse Collective"
          sizes="140px"
          width={140}
          height={78}
          preload
          style={{
            width: '140px', height: 'auto', display: 'block',
          }}
        />
      </div>

      {/* One-line hook */}
      <p style={{
        maxWidth: '460px', textAlign: 'center', margin: '0 0 0.5rem',
        fontFamily: 'var(--font-body)', fontSize: 'clamp(1rem, 4.5vw, 1.25rem)',
        lineHeight: 1.55, color: 'var(--color-star)', ...line(1),
      }}>
        We own devices looking into parallel worlds.
      </p>

      {/* Device showcase — leads the hero so the product hits first */}
      <div style={{ width: '100%', maxWidth: 820, margin: '1.75rem auto 0', ...line(2) }}>
        <McConsolePanel mcFunctions={mcFunctions} />
      </div>

      {/* CTA row — always horizontal, equal-width buttons */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.75rem',
        width: '100%', maxWidth: '620px',
      }}>
        <ArchiveButton type="button" style={{ flex: '1 1 180px', minWidth: 0, whiteSpace: 'nowrap' }}
          onClick={() => { posthog.capture('workspace_request_access_clicked'); requestAccess('hero') }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
            <path d="M12 3 L13.2 10.8 L21 12 L13.2 13.2 L12 21 L10.8 13.2 L3 12 L10.8 10.8 Z" stroke="currentColor" strokeWidth="1.4" fill="rgba(255,255,255,0.25)" strokeLinejoin="round" />
          </svg>
          REQUEST ACCESS
        </ArchiveButton>
        <ArchiveLinkButton href="/login" variant="secondary" style={{ flex: '1 1 180px', minWidth: 0, whiteSpace: 'nowrap' }}
          onClick={() => posthog.capture('workspace_login_clicked')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="10 17 15 12 10 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          LOGIN
        </ArchiveLinkButton>
      </div>

      {/* Three headline numbers — supporting proof, below the action buttons */}
      <div style={{ width: '100%', marginTop: '1.75rem', ...line(2) }}>
        <HeroStats worlds={stats?.worlds ?? null} voyagers={stats?.voyagers ?? null} />
      </div>

      {requestAccessModal}
    </section>
  )
}


/* ─── Device popup — days held + reservation entry (gated until devices open) ── */
function DeviceComingSoonModal({ days, onClose }: { days: number; onClose: () => void }) {
  const hasDevice = days > 0
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(10,14,39,0.82)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        animation: 'pathbar-fade 0.15s ease-out',
      }}
    >
      <ArchiveCard
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="archive-console-modal"
        role="dialog"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <DeviceBarIcon size={14} color="#E8A020" />
          <span style={{ fontSize: 'var(--fs-label)', color: '#E8A020', letterSpacing: '0.12em' }}>
            MULTIVERSE CONSOLE
          </span>
        </div>

        {/* Days held — focal number */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 40, lineHeight: 0.85, color: hasDevice ? '#20D890' : 'rgba(245,245,245,0.32)' }}>
            {days}
          </span>
          <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)', letterSpacing: '0.1em' }}>
            {days === 1 ? 'DAY HELD' : 'DAYS HELD'}
          </span>
        </div>

        <p style={{ margin: '0 0 16px', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.5)', lineHeight: 1.75 }}>
          {hasDevice
            ? 'Your Multiverse Console is active. Keep it online to extend your streak.'
            : "Device applications aren't open yet. We're preparing the first batch — you'll be able to reserve a Multiverse Console here as soon as they go live."}
        </p>

        {/* Reservation entry — disabled until devices open */}
        {!hasDevice && (
          <ArchiveButton disabled fullWidth>
            RESERVE A CONSOLE — COMING SOON
          </ArchiveButton>
        )}
      </ArchiveCard>
      <style>{`@keyframes pathbar-fade { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  )
}

function DeviceBarIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3.5" width="12" height="9" rx="1" stroke={color} strokeWidth="1.2" />
      <line x1="2" y1="6.5" x2="14" y2="6.5" stroke={color} strokeWidth="1" opacity="0.5" />
      <rect x="4" y="8.5" width="2.5" height="2" rx="0.4" stroke={color} strokeWidth="0.9" opacity="0.7" />
    </svg>
  )
}

/* ─── Auth Hero — Welcome Voyager (voyager+) / status-led (applicant) ──── */
function AuthHero({ user }: {
  user: { role: string; name?: string; email?: string; avatarUrl?: string | null }
}) {
  const isApplicant = user.role === 'applicant'
  const [deviceModal, setDeviceModal] = useState(false)

  // Device ownership — no claim flow exists yet, so days held is always 0.
  // Wire this to the real device-assignment date once devices open.
  const deviceDays = 0

  return (
    <section className="hero">
      {deviceModal && <DeviceComingSoonModal days={deviceDays} onClose={() => setDeviceModal(false)} />}

      {isApplicant ? (
        /* Applicant: brand lockup (same as guest) instead of "Welcome Voyager" */
        <>
          <div style={{
            width: '100%', textAlign: 'center',
            margin: 'clamp(1rem, 4vh, 2.25rem) 0 1.25rem',
          }}>
            <FlipWordmark maxWidth={616} fill={0.858} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.9rem', marginBottom: '1.5rem' }}>
            <SmartImage
              src="/assets/vi-icon.png"
              alt="Multiverse Collective"
              sizes="120px"
              width={120}
              height={67}
              preload
              style={{
                width: '120px', height: 'auto', display: 'block',
              }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', letterSpacing: '0.34em', color: 'var(--color-star-dim)' }}>
              EXPLORE PARALLEL WORLDS
            </span>
          </div>
        </>
      ) : (
        /* Voyager / Architect: full welcome */
        <>
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
        </>
      )}

      {/* ── Path status bar ── */}
      <div style={{ width: '100%', margin: isApplicant ? '0 auto' : '0.75rem auto 0', padding: '0 1.25rem' }}>
        <PathStatusBar user={user} deviceDays={deviceDays} onDeviceClick={() => setDeviceModal(true)} />
      </div>
    </section>
  )
}

/* ─── Live UTC clock ─────────────────────────────────────── */
// Renders an empty placeholder on the server + first client paint (so the two
// match — no hydration mismatch), then fills in and ticks every second after
// Placeholder that mirrors the embedded Signal Feed (2-column masonry, maxWidth
// 820, "INTERNAL UPDATES" divider). Rendered while the real feed is deferred so
// its height is reserved up front and the hero never gets shoved upward.
function FeedSkeleton({ hideHeader = false }: { hideHeader?: boolean }) {
  const heights = [150, 210, 120, 190, 160, 230, 140, 180]
  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <style>{`
        .feed-skel-ph { background-image: linear-gradient(100deg, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.02) 70%); background-size: 200% 100%; animation: feed-skel-ph-shimmer 1.4s ease-in-out infinite; }
        .feed-skel-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; padding: 0 0.5rem; min-height: 70vh; }
        @media (min-width: 640px) { .feed-skel-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @keyframes feed-skel-ph-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
      {!hideHeader && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0 6px 14px' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 700, letterSpacing: '0.3em', color: 'var(--color-nucleus)', opacity: 0.5 }}>INTERNAL UPDATES</span>
          <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
        </div>
      )}
      {/* min-height keeps the reserved feed area taller than the viewport's
          leftover space, so the hero stays at its natural height (not stretched)
          in both the skeleton and the loaded-feed state — no upward jump. */}
      <div className="feed-skel-grid" aria-hidden="true">
        {heights.map((h, i) => (
          <div key={i} className="feed-skel-ph" style={{ height: h, borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }} />
        ))}
      </div>
    </div>
  )
}

// mount. The previous inline `new Date()` differed between server and client by
// a second or two, forcing React to discard and rebuild the whole tree.
function UtcClock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const tick = () => setT(new Date().toISOString().slice(11, 19))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="val">{t || '--:--:--'}</span>
}

/* ─── Page ──────────────────────────────────────────────── */
// All initial data arrives as props from the server shell (page.tsx), so the
// first paint is already content-complete and full-height: no skeleton, no
// deferred feed fetch, no client feed cache. The auth context still takes over
// after hydration for live transitions (logout, role change).
export default function ConsoleClient({
  initialUser,
  initialMcFunctions,
  initialHeroStats,
  initialFeed,
  initialExperimentGroup,
}: {
  initialUser: AuthUser
  initialMcFunctions: McFunction[]
  initialHeroStats: GuestHeroStats | null
  initialFeed: FeedEntry[]
  initialExperimentGroup: ExperimentGroup | null
}) {
  const { user: liveUser, loading } = useAuth()
  // Server-resolved viewer until the client auth context finishes booting.
  const user = loading ? initialUser : liveUser
  const searchParams = useSearchParams()
  const utmTracked = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  // True while a restore is in flight — suspends the save listener so the
  // fresh-mount scrollTop (0) can't overwrite the real saved offset.
  const restoringRef = useRef(true)

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
  const feedEntries = initialFeed
  const mcFunctions = initialMcFunctions
  const heroStats = initialHeroStats
  const experimentGroup = initialExperimentGroup

  // ── Scroll restoration ──────────────────────────────────────────────────
  // The dashboard scrolls inside `.landing-main`, not the window, so Next's
  // built-in (window-based) restoration can't return you to where you left off
  // after visiting a world / device / signal page. We persist the container's
  // scrollTop to sessionStorage and restore it on return.
  //
  // Two things make this genuinely hard:
  //  1. Back-navigation REMOUNTS this component: a fresh `.landing-main` mounts
  //     at scrollTop 0, `feedEntries` resets to [] (the skeleton shows), and the
  //     real feed is re-fetched and re-deferred behind the wordmark (seconds
  //     later). So the page is far too short to hold a deep offset for a while,
  //     and the browser silently clamps scrollTop toward the top.
  //  2. The save listener races the restore: while the fresh mount sits at 0 (or
  //     a clamped value) the debounced save would happily overwrite the real
  //     saved offset with 0, destroying the target before we can use it.
  //
  // Fix: SUSPEND saving until a restore finishes (`restoringRef`), and drive the
  // restore from a `setInterval` that re-pins to the saved offset until the feed
  // has actually grown the page tall enough to reach it (or the user scrolls, or
  // a deadline). setInterval is used deliberately over requestAnimationFrame: rAF
  // is paused in background tabs, whereas the interval keeps correcting through
  // the skeleton→feed reflow regardless.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout> | undefined
    // Only persist positions the USER actually scrolled to. Navigating away
    // makes the router reset the container to the top, firing a scroll-to-0 that
    // would otherwise clobber the saved offset; the restore loop's own pinning
    // fires scroll events too. We distinguish these from real scrolling by
    // requiring a recent genuine input (wheel / touchmove / scroll-key). Taps on
    // a feed link don't count, so the leave-reset is correctly ignored.
    let lastInputAt = 0
    const markInput = () => { lastInputAt = Date.now() }
    const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'])
    const onKey = (e: KeyboardEvent) => { if (SCROLL_KEYS.has(e.key)) markInput() }
    const save = () => {
      if (restoringRef.current) return            // don't clobber mid-restore
      if (Date.now() - lastInputAt > 2000) return // ignore router / programmatic scrolls
      sessionStorage.setItem('console:scrollTop', String(el.scrollTop))
    }
    const onScroll = () => {
      // Debounce so we write at most every ~120ms while scrolling.
      if (timer) return
      timer = setTimeout(() => { timer = undefined; save() }, 120)
    }
    el.addEventListener('wheel', markInput, { passive: true })
    el.addEventListener('touchmove', markInput, { passive: true })
    window.addEventListener('keydown', onKey, true)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('wheel', markInput)
      el.removeEventListener('touchmove', markInput)
      window.removeEventListener('keydown', onKey, true)
      el.removeEventListener('scroll', onScroll)
      if (timer) clearTimeout(timer)
      save() // flush the final user position on unmount (gated like the rest)
    }
  }, [])

  // useLayoutEffect so the first pin happens BEFORE the browser paints — the
  // feed is server-rendered, so the page is already full-height on mount and
  // the pin normally lands in this single pre-paint write. A ResizeObserver
  // catches the rare late layout growth (font swap, image without a reserved
  // box) and re-pins; no polling.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const saved = Number(sessionStorage.getItem('console:scrollTop') ?? '')
    if (!saved) { restoringRef.current = false; return }
    restoringRef.current = true

    // Pin to the saved offset, clamped to the current height. Returns true once
    // the page is genuinely tall enough to hold the full offset.
    const pin = () => {
      const max = el.scrollHeight - el.clientHeight
      const target = Math.min(saved, max)
      if (Math.abs(el.scrollTop - target) > 1) el.scrollTop = target
      return max >= saved - 1
    }
    pin() // pre-paint

    let done = false
    // Only genuine input aborts — a raw `scroll` event is ambiguous (our own pin
    // and layout reflow both fire it), so we key off wheel / touch / scroll-keys.
    const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'])
    const stop = () => {
      if (done) return
      done = true
      ro.disconnect()
      clearTimeout(deadline)
      restoringRef.current = false // hand scroll-tracking back to the save effect
      el.removeEventListener('wheel', stop)
      el.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', onKey, true)
    }
    const onKey = (e: KeyboardEvent) => { if (SCROLL_KEYS.has(e.key)) stop() }
    el.addEventListener('wheel', stop, { passive: true })
    el.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', onKey, true)

    // Direct children growing (streamed sections, late images) changes the
    // scroller's scrollHeight; re-pin until the saved offset is reachable.
    const ro = new ResizeObserver(() => { if (pin()) stop() })
    for (const child of el.children) ro.observe(child)
    const deadline = setTimeout(stop, 4000)

    return stop
  }, [])

  const isGuest = user.role === 'guest'

  // Shared feed node — rendered inside the guest access gate, or standalone for
  // members. The Voyager ad slot rides as the lead block (door + ad coexist).
  // Both A/B groups go to the product page; group B's task gate is enforced at checkout.
  const packHref = '/voyager-pack'
  // Preview override: ?ad=direct or ?ad=task_gated forces the ad slot to render
  // with that variant (so you can try both without an applicant account).
  const adParam = searchParams.get('ad')
  const adOverride: ExperimentGroup | null =
    adParam === 'direct' || adParam === 'task_gated' ? adParam : null
  const showAd = SALES_OPEN &&
    (adOverride !== null || (user.role !== 'voyager' && user.role !== 'architect'))
  const leadSlot = showAd
    ? <VoyagerAdSlot group={adOverride ?? experimentGroup ?? 'direct'} />
    : undefined
  const feedNode = feedEntries.length > 0
    ? <FeedProtoClient entries={feedEntries} embedded packHref={packHref} leadSlot={leadSlot} />
    : <FeedSkeleton />

  return (
    <main className="landing-main archive-console-page" ref={scrollRef}>
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
          <div className="item">UTC <UtcClock /></div>
          <div className="item">UPLINK <span className="val">ACTIVE</span></div>
        </div>
      </div>

      {/* ── Hero: conditional on auth state (server-resolved, no loading flash) ── */}
      {isGuest ? (
        <GuestHero newHref={newHref} stats={heroStats} mcFunctions={mcFunctions} />
      ) : (
        <AuthHero user={user} />
      )}


      {/* ── Device intro + Signal Feed ──
           For a guest both sit under the access gate: frosted as one block (the
           glimpse grants a clear look at the top, the rest stays inside). For
           members the feed renders openly. The wrapper cancels .landing-main's
           mobile horizontal padding so the two-column stream spans portrait. */}
      {isGuest ? (
        <>
          {/* Device now leads the hero (see GuestHero); here just the gated feed. */}
          {/* INTERNAL UPDATES label — exposed above the frosted feed */}
          <div className="archive-console-section-label">
            <ArchiveSectionLabel>INTERNAL UPDATES</ArchiveSectionLabel>
          </div>
          {/* Only the feed is frosted now */}
          <section style={{ margin: '0.75rem -1.25rem 0', padding: '0 0.5rem' }}>
            <AccessGate permanentHref={newHref}>
              {feedEntries.length > 0
                ? <FeedProtoClient entries={feedEntries} embedded hideHeader packHref={packHref} leadSlot={leadSlot} />
                : <FeedSkeleton hideHeader />}
            </AccessGate>
          </section>
        </>
      ) : (
        <section style={{ margin: '0 -1.25rem', padding: '2.5rem 0.5rem 2rem' }}>
          {feedNode}
        </section>
      )}

      <div className="footer-bar" style={{ marginTop: '2rem', justifyContent: 'center' }}>
        <div className="tag">EXPLORE PARALLEL WORLDS</div>
      </div>
    </main>
  )
}
