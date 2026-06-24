'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import posthog from 'posthog-js'
import { useAuth } from '@/lib/auth-context'
import { getMcFunctions } from '@/lib/actions/mc-functions'
import { getGuestHeroStats } from '@/lib/actions/hero-stats'
import type { GuestHeroStats } from '@/lib/actions/hero-stats'
import { getSignalFeed } from '@/lib/actions/signal-feed'
import { FeedProtoClient, type FeedEntry } from '@/app/feed-proto/feed-client'
import { getOrAssignExperimentGroup } from '@/lib/actions/experiment'
import type { ExperimentGroup } from '@/lib/actions/experiment'
import { SectionTracker } from '@/components/section-tracker'
import { FlipWordmark, WORDMARK_READY_EVENT } from '@/components/flip-wordmark'
import { McConsolePanel } from '@/components/mc-console-panel'
import { PathStatusBar } from '@/components/path-status-bar'
import { AccessGate } from '@/components/access-gate'
import type { Device, World, McFunction, IntelWithAvatar } from '@/types/database'

// ─── Global sales gate — keep in sync with voyager-pack/page.tsx & api/checkout/route.ts ───
const SALES_OPEN = true

const STATUS_STYLES = {
  available:    { color: '#20D890', border: 'rgba(32,216,144,0.3)' },
  needs_repair: { color: '#E83030', border: 'rgba(232,48,48,0.3)' },
  in_use:       { color: '#E85D04', border: 'rgba(232,93,4,0.3)' },
  unknown:      { color: 'rgba(245,245,245,0.35)', border: 'rgba(255,107,53,0.16)' },
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
      <rect width="160" height="120" fill="#0F1430" />
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
      <line x1={cx - 15} y1={cy} x2={cx + 15} y2={cy} stroke="#E85D04" strokeWidth="0.8" opacity="0.5" />
      <line x1={cx} y1={cy - 15} x2={cx} y2={cy + 15} stroke="#E85D04" strokeWidth="0.8" opacity="0.5" />
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
    <Link
      href={`/devices/${device.id}`}
      style={{
        background: 'var(--color-void)',
        border: '1px solid var(--bd-faint)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,107,53,0.35)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd-faint)' }}
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
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.55)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {device.description}
        </p>
        {device.status === 'in_use' && device.current_user_name && (
          <div style={{ marginTop: '0.25rem', padding: '0.2rem 0.5rem', border: '1px solid rgba(232,93,4,0.2)', background: 'rgba(232,93,4,0.04)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.55)' }}>
            <span style={{ color: 'rgba(245,245,245,0.35)' }}>IN USE: </span>{device.current_user_name}
          </div>
        )}
      </div>
    </Link>
  )
}

/* ─── Voyager Ad Slot — homepage promo block between Status Feed & Device Registry ───
 *  A (direct)     → orange, "Initial Voyager Pack" → /voyager-pack (buy)
 *  B (task_gated) → amber,  "Earn Your Status"     → /voyager-path (watch track)
 *  Hero photo fades top + bottom into the card; faint breathing glow. */
function VoyagerAdSlot({ group }: { group: ExperimentGroup }) {
  const direct = group === 'direct'
  const accent = direct ? '#FF6B35' : '#E8A020'
  const soft   = direct ? 'rgba(255,107,53,' : 'rgba(232,160,32,'   // append "<a>)"
  const eyebrow = direct ? 'VOYAGER INITIATION' : 'VOYAGER RECRUITMENT'
  const title   = direct ? 'INITIAL VOYAGER PACK' : 'EARN YOUR STATUS'
  const cta     = 'ACTIVATE'
  const href    = direct ? '/voyager-pack' : '/voyager-path'

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
        @keyframes vp-breathe-o { 0%,100% { box-shadow: 0 0 16px rgba(255,107,53,0.22), 0 0 0 1px rgba(255,107,53,0.18); } 50% { box-shadow: 0 0 38px rgba(255,107,53,0.55), 0 0 70px rgba(255,107,53,0.18), 0 0 0 1px rgba(255,107,53,0.45); } }
        @keyframes vp-breathe-a { 0%,100% { box-shadow: 0 0 16px rgba(232,160,32,0.22), 0 0 0 1px rgba(232,160,32,0.18); } 50% { box-shadow: 0 0 38px rgba(232,160,32,0.52), 0 0 70px rgba(232,160,32,0.16), 0 0 0 1px rgba(232,160,32,0.42); } }
        .vp-ad--direct { animation: vp-breathe-o 3.6s ease-in-out infinite; }
        .vp-ad--gated  { animation: vp-breathe-a 3.6s ease-in-out infinite; }
      `}</style>

      {/* Hero photo — bleeds with a top + bottom fade into the card */}
      <div style={{ position: 'relative', height: 150, overflow: 'hidden', background: '#070A1A' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/voyager-pack/voyager-hero.png"
          alt={title}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 66%',
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

/* ─── Unknown Device Preview Card (greyed, uncontacted signal) ─── */
function UnknownDevicePreviewCard({ device }: { device: Device }) {
  return (
    <Link
      href={`/devices/${device.id}`}
      style={{
        background: '#0F1430',
        border: '1px solid var(--bd-faint)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        opacity: 0.7,
        textDecoration: 'none',
        transition: 'opacity 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.opacity = '0.9'; el.style.borderColor = 'rgba(255,107,53,0.2)' }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.opacity = '0.7'; el.style.borderColor = 'var(--bd-faint)' }}
    >
      <div style={{ aspectRatio: '4/3', overflow: 'hidden', borderBottom: '1px solid var(--bd-faint)', background: '#0A0D18' }}>
        {device.image_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={device.image_path} alt={device.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(60%) brightness(0.75)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', filter: 'grayscale(60%) brightness(0.75)' }}>
            <DevicePlaceholder id={device.id} />
          </div>
        )}
      </div>
      <div style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(255,107,53,0.28)', letterSpacing: '0.15em' }}>
              {device.id}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', fontWeight: 600, color: 'rgba(245,245,245,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {device.name}
            </div>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', whiteSpace: 'nowrap', flexShrink: 0,
            color: 'rgba(245,245,245,0.35)', border: '1px solid var(--bd-faint)', padding: '0.1rem 0.4rem',
          }}>
            ?
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(255,107,53,0.28)' }}>
          <span>◎</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{device.location}</span>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(255,107,53,0.28)', marginBottom: '0.25rem' }}>
            <span>PROGRESS</span>
            <span>{device.exploration_progress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${device.exploration_progress}%`, opacity: 0.4 }} />
          </div>
        </div>
      </div>
    </Link>
  )
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function IntelPreviewCard({ entry, commentCount }: { entry: IntelWithAvatar; commentCount: number }) {
  const color = TAG_COLOR[entry.tag] ?? 'var(--color-star-dim)'
  const hasImage = (entry.images?.length ?? 0) > 0
  const publisherName = entry.publisher_name ?? 'MULTIVERSE COLLECTIVE'

  return (
    <Link
      href={`/intel/${entry.id}`}
      className="block transition-all duration-150"
      style={{
        background: '#151B3A', border: '1px solid rgba(255,107,53,0.16)',
        overflow: 'hidden', textDecoration: 'none',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = color }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,107,53,0.16)' }}
    >
      {/* Publisher bar — mirrors Intel Feed style */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', background: '#0F1430', borderBottom: '1px solid rgba(255,107,53,0.12)' }}>
        {entry.publisher_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.publisher_avatar_url} alt={publisherName} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(138,154,181,0.25)' }} />
        ) : (
          <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `${color}18`, border: `1px solid ${color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 700, color }}>
            {getInitials(publisherName)}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', fontWeight: 600, color: '#F5F5F5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {publisherName}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)' }}>
            {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', color, border: `1px solid ${color}60`, padding: '2px 7px', flexShrink: 0 }}>
          {entry.tag}
        </span>
      </div>

      {/* Optional image */}
      {hasImage && (
        <div style={{ width: '100%', aspectRatio: '16/7', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={entry.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: BRAND_FILTER, display: 'block' }} />
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '0.9rem 1rem' }}>
        <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--fs-body)', color: '#F5F5F5', marginBottom: '0.4rem', lineHeight: 1.4 }}>
          {entry.title}
        </h3>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'rgba(245,245,245,0.55)', lineHeight: 1.6, margin: 0 }}>
          {entry.content.length > 120 ? entry.content.slice(0, 120) + '…' : entry.content}
        </p>

        {/* Footer: comment count + READ MORE */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.9rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)' }}>
            <MessageSquare size={11} />
            {commentCount}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color, opacity: 0.8 }}>
            READ MORE →
          </span>
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
        <span style={{ position: 'absolute', top: 6, left: 8, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)', background: 'rgba(7,9,18,0.7)', padding: '1px 5px' }}>
          {world.id}
        </span>
        <span style={{ position: 'absolute', bottom: 8, right: 8, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', color: 'rgba(232,160,32,0.8)' }}>
          VIEW →
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: '0.65rem 0.75rem', background: '#151B3A', border: '1px solid rgba(255,107,53,0.16)', borderTop: 'none' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', fontWeight: 600, color: '#F5F5F5', marginBottom: 6 }}>
          {displayName}
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.55)', lineHeight: 1.55, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {world.description}
        </p>
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,107,53,0.16)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.55)' }}>{world.discoverer_name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)' }}>{world.discovery_date}</span>
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
      <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}>
        {items.map(({ key, value, label }, i) => (
          <div key={key} style={{ display: 'contents' }}>
            {i > 0 && <div style={{ width: 1, background: 'rgba(255,107,53,0.16)', margin: '6px 0' }} />}
            <button
              type="button"
              onClick={() => setActive((prev) => (prev === key ? null : key))}
              aria-expanded={active === key}
              style={{
                flex: 1, padding: '8px 10px', background: active === key ? 'rgba(232,93,4,0.08)' : 'none',
                border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'center', font: 'inherit',
                transition: 'background 0.2s ease',
              }}
            >
              <div style={{
                fontFamily: 'var(--font-mono)', fontWeight: 500,
                fontSize: 'clamp(2rem, 9vw, 3.25rem)', height: 'clamp(2rem, 9vw, 3.25rem)', lineHeight: 1,
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                color: 'var(--color-nucleus)',
              }}>
                {value}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em',
                color: 'var(--color-star-dim)', marginTop: 9,
                minHeight: '2.6em', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              }}>
                {label}
              </div>
            </button>
          </div>
        ))}
      </div>

      {active && (
        <div style={{
          maxWidth: '470px', margin: '1rem auto 0',
          border: '1px solid rgba(255,107,53,0.22)', borderRadius: 8,
          background: 'rgba(232,93,4,0.05)', padding: '12px 16px',
          animation: 'fadeInUp 0.3s ease-out',
        }}>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', lineHeight: 1.75, color: 'var(--color-star-dim)' }}>
            {HERO_STAT_INFO[active]}
          </p>
        </div>
      )}
    </div>
  )
}

function GuestHero({ newHref, stats }: { newHref: string; stats: GuestHeroStats | null }) {
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
      {/* Brand wordmark — split-flap flip → spread to official lockup */}
      <div
        style={{
          width: '100%',
          textAlign: 'center',
          margin: 'clamp(1.25rem, 5vh, 3rem) 0 1.75rem',
          filter: 'drop-shadow(0 0 32px rgba(255,107,53,0.45)) drop-shadow(0 0 64px rgba(255,107,53,0.18))',
          ...line(0),
        }}
      >
        <FlipWordmark maxWidth={616} fill={0.858} />
      </div>

      {/* Emblem */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem', ...line(0) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/vi-icon.png"
          alt="Multiverse Collective"
          style={{
            width: '140px', height: 'auto', display: 'block',
            filter: 'drop-shadow(0 0 16px rgba(255,107,53,0.4)) drop-shadow(0 0 32px rgba(255,107,53,0.15))',
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

      {/* Three headline numbers — tap to reveal an explanation */}
      <div style={{ width: '100%', ...line(2) }}>
        <HeroStats worlds={stats?.worlds ?? null} voyagers={stats?.voyagers ?? null} />
      </div>

      {/* CTA row — always horizontal, equal-width buttons */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.25rem',
        width: '100%', maxWidth: '620px',
      }}>
        <Link href={newHref} className="btn-primary" style={{ flex: '1 1 180px', minWidth: 0, whiteSpace: 'nowrap', justifyContent: 'center', padding: '1rem 1.5rem' }}
          onClick={() => posthog.capture('workspace_request_access_clicked')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
            <path d="M12 3 L13.2 10.8 L21 12 L13.2 13.2 L12 21 L10.8 13.2 L3 12 L10.8 10.8 Z" stroke="currentColor" strokeWidth="1.4" fill="rgba(255,255,255,0.25)" strokeLinejoin="round" />
          </svg>
          REQUEST ACCESS
        </Link>
        <Link href="/login" className="btn-secondary" style={{ flex: '1 1 180px', minWidth: 0, whiteSpace: 'nowrap', justifyContent: 'center', padding: '1rem 1.5rem' }}
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

      {/* ── Ask us strip ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        marginTop: '1.25rem',
        opacity: 0.55,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
          letterSpacing: '0.12em', color: 'var(--color-star-dim)',
          whiteSpace: 'nowrap',
        }}>
          QUESTIONS ABOUT US:
        </span>
        {ASK_US_CONTACTS.map(({ name, handle, avatar, href }) => (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={`Ask ${name} on X`}
            style={{ display: 'inline-block', flexShrink: 0 }}
            onClick={() => posthog.capture('ask_us_clicked', { architect: name, x_handle: handle })}
            onMouseEnter={e => { (e.currentTarget.querySelector('img') as HTMLImageElement).style.borderColor = 'var(--color-nebula)'; e.currentTarget.style.opacity = '1' }}
            onMouseLeave={e => { (e.currentTarget.querySelector('img') as HTMLImageElement).style.borderColor = 'rgba(245,245,245,0.15)'; e.currentTarget.style.opacity = '0.85' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar}
              alt={name}
              style={{
                width: 28, height: 28, borderRadius: '50%', objectFit: 'cover',
                display: 'block',
                border: '1px solid rgba(245,245,245,0.15)',
                transition: 'border-color 0.15s',
              }}
            />
          </a>
        ))}
      </div>
    </section>
  )
}


/* ─── Ask-us strip — three architect contacts, visible to logged-in users ─── */
const ASK_US_CONTACTS = [
  {
    name: 'Ryo Tanaka',
    handle: 'ryotanakaputo',
    avatar: 'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/avatars/86fadca3-8739-4553-9179-c4d0e84895ee/avatar.jpg',
    href: 'https://x.com/ryotanakaputo',
  },
  {
    name: 'Valentina Cruz',
    handle: 'ValentinaCruzi',
    avatar: 'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/avatars/403b32a7-8d85-4cdd-9c7f-4f2c7919d726/avatar.jpg',
    href: 'https://x.com/ValentinaCruzi',
  },
  {
    name: 'Weile Yang',
    handle: 'weilelele',
    avatar: 'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/avatars/6fc6e5cd-35fe-4812-ac04-f9074c6ee0c7/avatar.png',
    href: 'https://x.com/weilelele',
  },
] as const

function AskUsStrip() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
      padding: '0 1.25rem', marginTop: '1rem',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
        letterSpacing: '0.12em', color: 'var(--color-star-dim)',
        whiteSpace: 'nowrap', opacity: 0.55,
      }}>
        QUESTIONS ABOUT US:
      </span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {ASK_US_CONTACTS.map(({ name, handle, avatar, href }) => (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={`Ask ${name} on X`}
            style={{ display: 'inline-block', flexShrink: 0, opacity: 0.7 }}
            onClick={() => posthog.capture('ask_us_clicked', { architect: name, x_handle: handle })}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.7' }}
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt={name}
                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '1px solid rgba(245,245,245,0.15)' }}
              />
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%',
                border: '1px solid rgba(255,107,53,0.35)', background: '#0A0D1A',
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                color: 'rgba(255,107,53,0.8)', letterSpacing: '0.02em',
              }}>
                WL
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
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
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 380, width: '100%',
          border: '1px solid rgba(232,160,32,0.3)',
          background: '#0F1430', padding: '22px 26px 18px',
          fontFamily: 'var(--font-mono)',
          boxShadow: '0 0 40px rgba(10,14,39,0.6)',
        }}
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
          <div
            aria-disabled="true"
            style={{
              textAlign: 'center',
              fontSize: 'var(--fs-caption)', fontWeight: 700, letterSpacing: '0.16em',
              color: 'rgba(245,245,245,0.4)',
              background: 'rgba(245,245,245,0.06)',
              border: '1px solid rgba(245,245,245,0.12)',
              padding: '0.6rem', marginBottom: 14, cursor: 'not-allowed',
            }}
          >
            RESERVE A CONSOLE — COMING SOON
          </div>
        )}
      </div>
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
            filter: 'drop-shadow(0 0 32px rgba(255,107,53,0.45)) drop-shadow(0 0 64px rgba(255,107,53,0.18))',
          }}>
            <FlipWordmark maxWidth={616} fill={0.858} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.9rem', marginBottom: '1.5rem' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/vi-icon.png"
              alt="Multiverse Collective"
              style={{
                width: '120px', height: 'auto', display: 'block',
                filter: 'drop-shadow(0 0 16px rgba(255,107,53,0.4)) drop-shadow(0 0 32px rgba(255,107,53,0.15))',
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
function FeedSkeleton() {
  const heights = [150, 210, 120, 190, 160, 230, 140, 180]
  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <style>{`
        .feed-skel-ph { background-image: linear-gradient(100deg, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.02) 70%); background-size: 200% 100%; animation: feed-skel-ph-shimmer 1.4s ease-in-out infinite; }
        @keyframes feed-skel-ph-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0 6px 14px' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 700, letterSpacing: '0.3em', color: 'var(--color-nucleus)', opacity: 0.5 }}>INTERNAL UPDATES</span>
        <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
      </div>
      {/* min-height keeps the reserved feed area taller than the viewport's
          leftover space, so the hero stays at its natural height (not stretched)
          in both the skeleton and the loaded-feed state — no upward jump. */}
      <div style={{ columnCount: 2, columnGap: 8, padding: '0 0.5rem', minHeight: '70vh' }} aria-hidden="true">
        {heights.map((h, i) => (
          <div key={i} className="feed-skel-ph" style={{ breakInside: 'avoid', marginBottom: 8, height: h, borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }} />
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
// Session-lived cache of the Signal Feed. Back-navigation remounts this page and
// resets component state, which would otherwise drop the feed to empty, re-show
// the skeleton, and re-defer the (2-3s) fetch behind the wordmark — collapsing
// the page height so a restored deep scroll snaps back to the top. Seeding state
// from this cache makes a return render the full-height feed immediately (no
// skeleton, no collapse), so scroll restoration is instant and stable.
//
// The in-memory copy is the fast path for soft (client) navigations. It's also
// mirrored to sessionStorage so a FULL document reload — which some back actions
// trigger (e.g. an iOS Safari bfcache miss) and which wipes module memory — can
// still seed the feed synchronously and land at the saved offset.
const FEED_CACHE_KEY = 'console:feed'
let feedCache: FeedEntry[] = []

function readFeedCache(): FeedEntry[] {
  if (feedCache.length) return feedCache
  try {
    const raw = sessionStorage.getItem(FEED_CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) { feedCache = parsed; return parsed }
    }
  } catch { /* sessionStorage unavailable / quota / parse — fall through to empty */ }
  return []
}

function writeFeedCache(d: FeedEntry[]) {
  feedCache = d
  try { sessionStorage.setItem(FEED_CACHE_KEY, JSON.stringify(d)) } catch { /* quota — keep in-memory only */ }
}

export default function ConsolePage() {
  return <Suspense><ConsoleInner /></Suspense>
}

function ConsoleInner() {
  const { user, loading } = useAuth()
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
  const [feedEntries, setFeedEntries] = useState<FeedEntry[]>(() => feedCache)
  const [mcFunctions, setMcFunctions] = useState<McFunction[]>([])
  const [heroStats, setHeroStats] = useState<GuestHeroStats | null>(null)
  const [experimentGroup, setExperimentGroup] = useState<ExperimentGroup | null>(null)

  // Guest access window: masked until the visitor opens a 10-minute viewing
  // window ("Yes, I will"). Hydrate from localStorage so an in-window refresh
  // stays revealed; an elapsed window re-masks. Members never see the mask.

  useEffect(() => {
    // Each section loads independently — a single failed query must not become an
    // unhandled rejection or leave the whole dashboard hanging. Catch + log per
    // fetch so a broken section degrades gracefully (stays empty) and is visible.
    const onErr = (where: string) => (e: unknown) =>
      console.error(`[console] ${where} failed:`, (e as Error)?.message ?? e)

    getMcFunctions().then((fns) => setMcFunctions(fns as McFunction[])).catch(onErr('getMcFunctions'))
    getGuestHeroStats().then(setHeroStats).catch(onErr('getGuestHeroStats'))
  }, [])

  // Defer the heavy Signal Feed load until the wordmark animation has settled, so
  // the once-per-day split-flap gets the main thread/network to itself on first
  // paint. Heroes without a wordmark (voyager/architect) load immediately. A
  // skeleton reserves the feed's height meanwhile, so the hero never jumps. A
  // fallback timer guarantees the feed still loads if the ready signal is missed.
  const feedRequested = useRef(false)
  useEffect(() => {
    if (loading || feedRequested.current) return
    const load = () => {
      if (feedRequested.current) return
      feedRequested.current = true
      getSignalFeed().then((d) => { writeFeedCache(d); setFeedEntries(d) }).catch((e) =>
        console.error('[console] getSignalFeed failed:', (e as Error)?.message ?? e))
    }
    const heroHasWordmark = user.role === 'guest' || user.role === 'applicant'
    // If we already have a cached feed (a return visit, incl. full reloads via
    // sessionStorage), the page is full-height and the wordmark is static —
    // refresh immediately instead of deferring, so we never reintroduce the
    // skeleton/collapse window.
    if (!heroHasWordmark || readFeedCache().length > 0) { load(); return }
    window.addEventListener(WORDMARK_READY_EVENT, load, { once: true })
    const fallback = setTimeout(load, 6000)
    return () => { window.removeEventListener(WORDMARK_READY_EVENT, load); clearTimeout(fallback) }
  }, [loading, user.role])

  // Load the experiment group for any signed-in member (drives the ad-slot
  // variant). Guests stay null and fall back to the 'direct' variant below.
  useEffect(() => {
    if (!loading && user.role !== 'guest') {
      getOrAssignExperimentGroup().then(setExperimentGroup)
    }
  }, [loading, user.role])

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

  // useLayoutEffect so the first pin happens BEFORE the browser paints — with the
  // feed seeded from cache the page is already full-height on a return, so this
  // lands us at the saved offset with no visible jump-from-top at all.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return

    // On a full reload the module cache is gone and we mount as a skeleton. Seed
    // the feed synchronously from the persistent cache BEFORE we pin, so the page
    // is already full-height and the pin lands exactly — no flash, no land-near-
    // top. flushSync forces the commit before the next line reads scrollHeight.
    if (feedEntries.length === 0) {
      const cached = readFeedCache()
      if (cached.length) flushSync(() => setFeedEntries(cached))
    }

    const saved = Number(sessionStorage.getItem('console:scrollTop') ?? '')
    if (!saved) { restoringRef.current = false; return }
    restoringRef.current = true

    // Immediate pre-paint pin (clamped to current height; the interval keeps
    // correcting as a deferred feed grows the page on a cold load).
    el.scrollTop = Math.min(saved, el.scrollHeight - el.clientHeight)

    let done = false
    let aborted = false
    const onIntent = () => { aborted = true }
    // Only genuine input aborts — a raw `scroll` event is ambiguous (our own pin
    // and layout reflow both fire it), so we key off wheel / touch / scroll-keys.
    const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'])
    const onKey = (e: KeyboardEvent) => { if (SCROLL_KEYS.has(e.key)) aborted = true }
    el.addEventListener('wheel', onIntent, { passive: true })
    el.addEventListener('touchstart', onIntent, { passive: true })
    window.addEventListener('keydown', onKey, true)

    const stop = () => {
      if (done) return
      done = true
      clearInterval(id)
      restoringRef.current = false // hand scroll-tracking back to the save effect
      el.removeEventListener('wheel', onIntent)
      el.removeEventListener('touchstart', onIntent)
      window.removeEventListener('keydown', onKey, true)
    }

    const start = Date.now()
    let reachedAt = 0
    const id = setInterval(() => {
      if (aborted) { stop(); return }
      const max = el.scrollHeight - el.clientHeight
      const target = Math.min(saved, max) // follow the page up as the feed grows
      if (Math.abs(el.scrollTop - target) > 1) el.scrollTop = target
      // Settled only once the page is genuinely tall enough to reach `saved`
      // (not a skeleton-height clamp) and we've held there briefly.
      if (max >= saved - 1 && Math.abs(el.scrollTop - saved) <= 1) {
        if (!reachedAt) reachedAt = Date.now()
        if (Date.now() - reachedAt >= 300) { stop(); return }
      } else {
        reachedAt = 0
      }
      if (Date.now() - start >= 12000) { stop(); return } // hard deadline
    }, 50)

    return stop
    // Mount-only: feedEntries.length is read once to decide the initial seed; the
    // restore must NOT re-run when the feed updates, or it would re-pin scroll
    // after the user has moved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isGuest = !loading && user.role === 'guest'

  // Shared feed node — rendered inside the guest access gate, or standalone for
  // members. The Voyager ad slot rides as the lead block (door + ad coexist).
  const packHref = (experimentGroup ?? 'direct') === 'direct' ? '/voyager-pack' : '/voyager-path'
  const leadSlot = !loading && SALES_OPEN && user.role !== 'voyager' && user.role !== 'architect'
    ? <VoyagerAdSlot group={experimentGroup ?? 'direct'} />
    : undefined
  const feedNode = feedEntries.length > 0
    ? <FeedProtoClient entries={feedEntries} embedded packHref={packHref} leadSlot={leadSlot} />
    : <FeedSkeleton />

  return (
    <div className="landing-main" ref={scrollRef}>
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

      {/* ── Hero: conditional on auth state ── */}
      {loading ? (
        <section className="hero" style={{ flex: 1 }} />
      ) : isGuest ? (
        <GuestHero newHref={newHref} stats={heroStats} />
      ) : (
        <AuthHero user={user} />
      )}

      {/* ── Ask-us strip — only for logged-in members ── */}
      {!loading && !isGuest && <AskUsStrip />}

      {/* ── Device showcase (public) + Signal Feed ──
           For a guest the device intro is shown openly (the showcase, full feed
           width) and the live feed renders frosted as "More Internal Information"
           — visible-but-unreadable, the reward for activating. For members both
           render openly. The feed cancels .landing-main's mobile horizontal
           padding so the two-column stream spans the full portrait width. */}
      {loading ? (
        <section style={{ margin: '0 -1.25rem', padding: '2.5rem 0.5rem 2rem' }}>
          <FeedSkeleton />
        </section>
      ) : isGuest ? (
        <>
          <section style={{ width: '100%', maxWidth: 820, margin: '1.5rem auto 0', padding: '0 0.5rem' }}>
            <McConsolePanel mcFunctions={mcFunctions} />
          </section>
          <section style={{ margin: '2rem -1.25rem 0', padding: '0 0.5rem' }}>
            <AccessGate permanentHref={newHref}>
              {feedNode}
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
    </div>
  )
}
