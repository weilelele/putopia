'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import posthog from 'posthog-js'
import { useAuth } from '@/lib/auth-context'
import { getAllDevices } from '@/lib/actions/devices'
import { getPublicIntel } from '@/lib/actions/intel'
import { getCommentCountsBulk } from '@/lib/actions/comments'
import { getAllVotes, getVoteResultsBulk, getMyVoteResponses } from '@/lib/actions/votes'
import { getAllWorlds } from '@/lib/actions/worlds'
import { getMcFunctions } from '@/lib/actions/mc-functions'
import { getActivityFeed } from '@/lib/actions/activity-events'
import { getOrAssignExperimentGroup } from '@/lib/actions/experiment'
import type { ExperimentGroup } from '@/lib/actions/experiment'
import { ActivityFeed } from '@/components/activity-feed'
import { VoteCard } from '@/components/VoteCard'
import { SectionTracker } from '@/components/section-tracker'
import { FlipWordmark } from '@/components/flip-wordmark'
import { McConsolePanel } from '@/components/mc-console-panel'
import type { Device, Intel, Vote, World, McFunction, IntelWithAvatar } from '@/types/database'
import type { ActivityEvent } from '@/lib/actions/activity-events'

// ─── Global sales gate — keep in sync with voyager-pack/page.tsx & api/checkout/route.ts ───
// ─── Global sales gate — keep in sync with voyager-pack/page.tsx & api/checkout/route.ts ───
const SALES_OPEN = false

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

/* ─── First Parts Pack claim card (brightest orange — front of registry) ─── */
function ClaimPreviewCard() {
  return (
    <Link
      href="/devices/claim"
      style={{
        background: 'var(--color-void)',
        border: '1px solid #FF6B35',
        boxShadow: '0 0 18px rgba(255,107,53,0.28)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 28px rgba(255,107,53,0.5)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 18px rgba(255,107,53,0.28)' }}
    >
      <div style={{ aspectRatio: '4/3', overflow: 'hidden', borderBottom: '1px solid rgba(255,107,53,0.35)', background: '#0A0D1F', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://picsum.photos/seed/cairo-batch-01/600/450"
          alt="Cairo Batch 01 — first parts pack"
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.7) brightness(0.6)' }}
        />
        <span style={{
          position: 'absolute', top: 8, right: 8,
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 700, letterSpacing: '0.1em',
          color: '#070912', background: '#FF6B35', padding: '0.1rem 0.45rem',
        }}>
          CLAIM
        </span>
      </div>
      <div style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: '#FF6B35', letterSpacing: '0.15em' }}>
              CAIRO-BATCH-01
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--color-star)' }}>
              FIRST PARTS PACK
            </div>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', whiteSpace: 'nowrap', flexShrink: 0,
            color: '#FF6B35', border: '1px solid #FF6B35', padding: '0.1rem 0.35rem', background: 'rgba(255,107,53,0.08)',
          }}>
            $12
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 700, letterSpacing: '0.12em', color: '#FF6B35' }}>
          AWAITING CLAIM
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.55)', lineHeight: 1.6 }}>
          Secure the first pack from the Cairo discovery, activate Voyager status, and unlock the trait test.
        </p>
        <div style={{
          marginTop: 'auto', textAlign: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 700, letterSpacing: '0.15em',
          color: '#070912', background: '#FF6B35', padding: '0.4rem',
        }}>
          [ SECURE PARTS PACK ]
        </div>
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
  const badge   = direct ? 'ACTIVATE' : 'RECRUITING'
  const eyebrow = direct ? 'VOYAGER INITIATION' : 'VOYAGER RECRUITMENT'
  const title   = direct ? 'INITIAL VOYAGER PACK' : 'EARN YOUR STATUS'
  const chip    = direct ? '$12' : '2 TASKS'
  const cta      = direct ? 'ACTIVATE VOYAGER STATUS' : 'ACTIVATE WATCH STATUS'
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
            width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 40%',
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
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: accent, letterSpacing: '0.15em' }}>
            {eyebrow}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--color-star)' }}>
            {title}
          </div>
        </div>

        <div style={{
          textAlign: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 700, letterSpacing: '0.18em',
          color: '#070912', background: accent, padding: '0.5rem',
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
          <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `${color}18`, border: `1px solid ${color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, color }}>
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

function GuestHero({ newHref, mcFunctions }: { newHref: string; mcFunctions: McFunction[] }) {
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
          fontSize: 'clamp(1.4rem, 6.5vw, 2rem)', letterSpacing: '0.12em', whiteSpace: 'nowrap',
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
      <div style={{ width: '100%', margin: '1.75rem auto 0' }}>
        <McConsolePanel mcFunctions={mcFunctions} />
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
        {([
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
        ] as const).map(({ name, handle, avatar, href }) => (
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


/* ─── Device "coming soon" popup (same pattern as locked Voyager rows) ── */
function DeviceComingSoonModal({ onClose }: { onClose: () => void }) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <DeviceBarIcon size={14} color="#E8A020" />
          <span style={{ fontSize: 'var(--fs-label)', color: '#E8A020', letterSpacing: '0.12em' }}>
            DEVICE SCAN IN PROGRESS
          </span>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.5)', lineHeight: 1.75 }}>
          You don&apos;t have a Multiverse Console assigned yet. We&apos;re still scanning for
          available devices — we&apos;ll notify you as soon as one is ready for you.
        </p>
        <div style={{ fontSize: 9, color: 'rgba(245,245,245,0.15)', letterSpacing: '0.14em', textAlign: 'center' }}>
          TAP ANYWHERE TO DISMISS
        </div>
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

/* ─── Path status bar — avatar · identity · device (entry to the Path) ── */
function PathStatusBar({
  user, onDeviceClick,
}: {
  user: { role: string; name?: string; email?: string; avatarUrl?: string | null }
  onDeviceClick: () => void
}) {
  const isApplicant = user.role === 'applicant'
  const isArchitect = user.role === 'architect'

  // Identity accent
  const idColor = isApplicant ? '#E8A020' : isArchitect ? '#FF6B35' : '#FFB07A'
  const idLabel = isApplicant ? 'APPLICANT' : isArchitect ? 'ARCHITECT' : 'VOYAGER'

  // Profile-completion nudge: a Voyager who hasn't set an avatar yet.
  const showNudge = user.role === 'voyager' && !user.avatarUrl

  const name = user.name || user.email?.split('@')[0] || 'Voyager'
  const initials = name.slice(0, 2).toUpperCase()

  // Device ownership (no claim flow yet → always false / gray logo).
  const hasDevice = false

  const cell: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    padding: '11px 18px', textDecoration: 'none',
    fontFamily: 'var(--font-mono)', cursor: 'pointer',
    background: 'transparent', border: 'none',
    transition: 'background 0.15s',
  }
  const divider = <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,107,53,0.14)' }} />

  return (
    <div className="hud-frame hud-frame--orange" style={{
      width: '100%', maxWidth: 560, margin: '0 auto',
      display: 'flex', alignItems: 'stretch',
      padding: 0, background: 'var(--color-void)',
    }}>
      {/* ── Avatar → /profile ── */}
      <Link
        href="/profile"
        title="Edit your profile"
        style={{ ...cell, flex: '0 0 auto' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,107,53,0.05)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={name} style={{
              width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', display: 'block',
              border: '1.5px solid rgba(255,138,92,0.4)',
            }} />
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: '50%',
              border: `1.5px solid ${idColor}66`, background: '#0A0D1A',
              fontSize: 12, fontWeight: 700, color: idColor, letterSpacing: '0.02em',
            }}>
              {initials}
            </span>
          )}
          {showNudge && (
            <span style={{
              position: 'absolute', top: -2, right: -2,
              width: 9, height: 9, borderRadius: '50%',
              background: '#E83030', border: '1.5px solid var(--color-void)',
              boxShadow: '0 0 6px rgba(232,48,48,0.8)',
              animation: 'pathbar-pulse 1.8s ease-in-out infinite',
            }} />
          )}
        </span>
      </Link>

      {divider}

      {/* ── Identity → Path page ── */}
      <Link
        href="/voyager-path"
        title="View your path"
        style={{ ...cell, flex: 1 }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,107,53,0.05)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: idColor, boxShadow: `0 0 6px ${idColor}`, flexShrink: 0 }} />
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
          <span style={{ fontSize: 12, color: idColor, letterSpacing: '0.18em', fontWeight: 700 }}>
            {idLabel}
          </span>
          <span style={{ fontSize: 8.5, color: 'var(--color-star-dim)', letterSpacing: '0.14em', marginTop: 3 }}>
            VIEW YOUR PATH
          </span>
        </span>
      </Link>

      {divider}

      {/* ── Device status → popup (brand logo, gray=none / green=owned) ── */}
      <button
        onClick={onDeviceClick}
        title={hasDevice ? 'Device active' : 'No device assigned'}
        style={{ ...cell, flex: '0 0 auto' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,107,53,0.05)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <span
          aria-label={hasDevice ? 'Device active' : 'No device'}
          style={{
            display: 'inline-block', width: 32, height: 19, flexShrink: 0,
            background: hasDevice ? '#20D890' : 'rgba(245,245,245,0.32)',
            WebkitMaskImage: 'url(/assets/vi-icon.png)',
            maskImage: 'url(/assets/vi-icon.png)',
            WebkitMaskSize: 'contain', maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center', maskPosition: 'center',
            filter: hasDevice ? 'drop-shadow(0 0 5px rgba(32,216,144,0.5))' : 'none',
          }}
        />
      </button>

      <style>{`
        @keyframes pathbar-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.25); opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}

/* ─── Auth Hero — Welcome Voyager (voyager+) / status-led (applicant) ──── */
function AuthHero({ user, activityEvents }: {
  user: { role: string; name?: string; email?: string; avatarUrl?: string | null }
  activityEvents: ActivityEvent[]
}) {
  const isApplicant = user.role === 'applicant'
  const [deviceModal, setDeviceModal] = useState(false)

  return (
    <section className="hero">
      {deviceModal && <DeviceComingSoonModal onClose={() => setDeviceModal(false)} />}

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

      {/* ── Path status bar (above the Status Feed) ── */}
      <div style={{ width: '100%', margin: isApplicant ? '0 auto' : '0.75rem auto 0', padding: '0 1.25rem' }}>
        <PathStatusBar user={user} onDeviceClick={() => setDeviceModal(true)} />
      </div>

      {/* ── Status Feed ── */}
      {activityEvents.length > 0 && (
        <div style={{ width: '100%', maxWidth: '560px', margin: '0.75rem auto 0', padding: '0 1.25rem' }}>
          <ActivityFeed events={activityEvents} />
        </div>
      )}
    </section>
  )
}

/* ─── Live UTC clock ─────────────────────────────────────── */
// Renders an empty placeholder on the server + first client paint (so the two
// match — no hydration mismatch), then fills in and ticks every second after
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
  const [latestIntel, setLatestIntel] = useState<IntelWithAvatar[]>([])
  const [intelCommentCounts, setIntelCommentCounts] = useState<Record<string, number>>({})
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([])
  const [latestVotes, setLatestVotes] = useState<Vote[]>([])
  const [voteTallies, setVoteTallies] = useState<Record<string, Record<string, number>>>({})
  const [myVoteResponses, setMyVoteResponses] = useState<{ vote_id: string; selected_options: string[] }[]>([])
  const [latestWorlds, setLatestWorlds] = useState<World[]>([])
  const [mcFunctions, setMcFunctions] = useState<McFunction[]>([])
  const [experimentGroup, setExperimentGroup] = useState<ExperimentGroup | null>(null)

  useEffect(() => {
    // Each section loads independently — a single failed query must not become an
    // unhandled rejection or leave the whole dashboard hanging. Catch + log per
    // fetch so a broken section degrades gracefully (stays empty) and is visible.
    const onErr = (where: string) => (e: unknown) =>
      console.error(`[console] ${where} failed:`, (e as Error)?.message ?? e)

    getAllDevices().then((all) => {
      const unknown = all.filter((dev) => dev.knowledge === 'unknown').slice(0, 1)
      const known = all.filter((dev) => dev.knowledge === 'known').slice(0, 2)
      setDevices([...unknown, ...known])
    }).catch(onErr('getAllDevices'))
    getPublicIntel().then(async (intel) => {
      const slice = (intel as IntelWithAvatar[]).slice(0, 3)
      setLatestIntel(slice)
      if (slice.length > 0) {
        const counts = await getCommentCountsBulk('intel', slice.map(e => e.id))
        setIntelCommentCounts(counts)
      }
    }).catch(onErr('getPublicIntel'))
    getActivityFeed(7).then(setActivityEvents).catch(onErr('getActivityFeed'))
    getAllWorlds().then((w) => setLatestWorlds([...w].reverse().slice(0, 4))).catch(onErr('getAllWorlds'))
    getMcFunctions().then((fns) => setMcFunctions(fns as McFunction[])).catch(onErr('getMcFunctions'))
    getAllVotes().then(async (votes) => {
      const active = votes.filter((v) => v.is_active).slice(0, 3)
      setLatestVotes(active)
      if (active.length > 0) {
        const tallies = await getVoteResultsBulk(active.map((v) => v.id))
        setVoteTallies(tallies)
      }
    }).catch(onErr('getAllVotes'))
    getMyVoteResponses().then(setMyVoteResponses).catch(onErr('getMyVoteResponses'))
  }, [])

  // Load experiment group for applicants (drives the ad-slot variant)
  useEffect(() => {
    if (!loading && user.role === 'applicant') {
      getOrAssignExperimentGroup().then(setExperimentGroup)
    }
  }, [loading, user.role])

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
          <div className="item">UTC <UtcClock /></div>
          <div className="item">UPLINK <span className="val">ACTIVE</span></div>
        </div>
      </div>

      {/* ── Hero: conditional on auth state ── */}
      {loading ? (
        <section className="hero" style={{ flex: 1 }} />
      ) : isGuest ? (
        <GuestHero newHref={newHref} mcFunctions={mcFunctions} />
      ) : (
        <AuthHero user={user} activityEvents={activityEvents} />
      )}

      {/* ── Voyager ad slot — between Status Feed and Device Registry ──
           A (direct) → /voyager-pack · B (task_gated) → /voyager-path.
           Hidden for non-applicants and while sales are closed. */}
      {!loading && SALES_OPEN && user.role === 'applicant' && experimentGroup && (
        <section style={{ padding: '0.5rem 2.5rem 0' }}>
          <div style={{ maxWidth: 360, margin: '0 auto' }}>
            <VoyagerAdSlot group={experimentGroup} />
          </div>
        </section>
      )}

      {/* ── Devices (unknown + known) ── */}
      {devices.length > 0 && (
        <section style={{ padding: '3rem 2.5rem 2rem' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.3em', color: 'var(--color-nucleus)' }}>
                DEVICE REGISTRY
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {user.role === 'architect' && <ClaimPreviewCard />}
              {devices.map((device) => (
                device.knowledge === 'unknown'
                  ? <UnknownDevicePreviewCard key={device.id} device={device} />
                  : <DevicePreviewCard key={device.id} device={device} />
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
                <IntelPreviewCard key={entry.id} entry={entry} commentCount={intelCommentCounts[entry.id] ?? 0} />
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
            <div className="votes-grid">
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
