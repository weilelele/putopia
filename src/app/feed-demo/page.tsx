'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = 'intel' | 'device' | 'world' | 'vote_open' | 'vote_cast' | 'member_join'

interface SocialLink { platform: string; url: string }

interface Actor {
  name: string
  role: 'voyager' | 'architect'
  socials?: SocialLink[]
}

interface FeedEvent {
  id: string
  type: EventType
  actor: Actor
  ts: string
  title: string
  detail?: string
  imageUrl?: string
  href: string
  voteOption?: string
  groupKey?: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_EVENTS: FeedEvent[] = [
  // vote group ──────────────────────────────────────────────────────────────
  {
    id: 'e1',
    type: 'vote_cast',
    actor: { name: 'NOVA', role: 'voyager' },
    ts: '2h ago', title: 'Should we launch the WORLD-09 expedition immediately?',
    detail: '→ Yes — launch immediately',
    href: '/vote', voteOption: 'Yes — launch immediately', groupKey: 'vote-world09',
  },
  {
    id: 'e2',
    type: 'vote_cast',
    actor: { name: 'REX', role: 'voyager' },
    ts: '3h ago', title: 'Should we launch the WORLD-09 expedition immediately?',
    detail: '→ Yes — launch immediately',
    href: '/vote', voteOption: 'Yes — launch immediately', groupKey: 'vote-world09',
  },
  {
    id: 'e3',
    type: 'vote_cast',
    actor: { name: 'ARA', role: 'voyager' },
    ts: '4h ago', title: 'Should we launch the WORLD-09 expedition immediately?',
    detail: '→ Hold — await further intel',
    href: '/vote', voteOption: 'Hold — await further intel', groupKey: 'vote-world09',
  },
  {
    id: 'e4',
    type: 'vote_cast',
    actor: { name: 'MILO', role: 'voyager' },
    ts: '5h ago', title: 'Should we launch the WORLD-09 expedition immediately?',
    detail: '→ Yes — launch immediately',
    href: '/vote', voteOption: 'Yes — launch immediately', groupKey: 'vote-world09',
  },
  {
    id: 'e6',
    type: 'vote_open',
    actor: { name: 'WILL', role: 'architect' },
    ts: '7h ago', title: 'Should we launch the WORLD-09 expedition immediately?',
    detail: 'Closes: 2026.06.09 · Scope: all Voyagers',
    href: '/vote', groupKey: 'vote-world09',
  },

  // intel with image ────────────────────────────────────────────────────────
  {
    id: 'e5',
    type: 'intel',
    actor: { name: 'WILL', role: 'architect' },
    ts: '6h ago',
    title: 'WORLD-09 Anomalous Signal Analysis Report',
    detail: 'Probe captured a periodic pulse in Sector III — frequency inconsistent with known natural phenomena.',
    imageUrl: 'https://picsum.photos/seed/signal42/300/200',
    href: '/intel/world09-anomaly',
  },

  // device with image ───────────────────────────────────────────────────────
  {
    id: 'e7',
    type: 'device',
    actor: { name: 'REX', role: 'voyager' },
    ts: '1d ago',
    title: 'DEVICE-042 — Quantum Scanner Mk.III',
    detail: 'Status → IN USE · Location: Lab-C',
    imageUrl: 'https://picsum.photos/seed/device042/300/200',
    href: '/devices',
  },

  // world with image ────────────────────────────────────────────────────────
  {
    id: 'e8',
    type: 'world',
    actor: { name: 'WILL', role: 'architect' },
    ts: '2d ago',
    title: 'WORLD-09 — Neon Abyss',
    detail: 'New parallel world record filed. Discovery coordinates: Sector 7-G',
    imageUrl: 'https://picsum.photos/seed/world09/300/200',
    href: '/worlds/world-09',
  },

  // member join — with socials ───────────────────────────────────────────────
  {
    id: 'e9',
    type: 'member_join',
    actor: {
      name: 'ARA',
      role: 'voyager',
      socials: [
        { platform: 'X', url: 'https://x.com/ara_void' },
        { platform: 'IG', url: 'https://instagram.com/ara_void' },
      ],
    },
    ts: '3d ago', title: 'ARA joined the Collective', href: '/voyagers',
  },

  // intel without image ─────────────────────────────────────────────────────
  {
    id: 'e10',
    type: 'intel',
    actor: { name: 'NOVA', role: 'voyager' },
    ts: '4d ago',
    title: 'Device Log: Quantum Scanner Mk.III Calibration',
    detail: 'Calibration complete. Baseline frequency deviation corrected to ±0.002Hz.',
    href: '/intel/device-calibration',
  },

  // member join — no socials ────────────────────────────────────────────────
  {
    id: 'e11',
    type: 'member_join',
    actor: { name: 'MILO', role: 'voyager' },
    ts: '5d ago', title: 'MILO joined the Collective', href: '/voyagers',
  },
]

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ actor, size = 36 }: { actor: Actor; size?: number }) {
  const initials = actor.name.slice(0, 2)
  const isArch = actor.role === 'architect'
  const color  = isArch ? '#E35205' : '#FF8A5C'
  const border = isArch ? 'rgba(227,82,5,0.55)' : 'rgba(255,138,92,0.4)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: `1.5px solid ${border}`, background: '#0A0D1A',
      fontFamily: 'var(--font-mono)', fontSize: size * 0.33, fontWeight: 700,
      color, letterSpacing: '0.02em', userSelect: 'none',
    }}>
      {initials}
    </span>
  )
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────
// Width = 4:3 of height. Height ~ 3 text lines ≈ 90px.

function Thumb({ url }: { url: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      style={{
        width: 120, height: 90, objectFit: 'cover', flexShrink: 0,
        border: '1px solid rgba(245,245,245,0.08)',
        display: 'block',
        filter: 'brightness(0.82) saturate(0.65)',
      }}
    />
  )
}

// ─── Feed Row ─────────────────────────────────────────────────────────────────

function FeedRow({ event }: { event: FeedEvent }) {
  const isMember = event.type === 'member_join'
  const isVoteOpen = event.type === 'vote_open'

  const verb =
    event.type === 'intel'       ? 'published' :
    event.type === 'device'      ? 'updated' :
    event.type === 'world'       ? 'logged' :
    event.type === 'vote_open'   ? 'opened a vote' :
    event.type === 'vote_cast'   ? 'voted' :
    ''

  return (
    <Link
      href={event.href}
      style={{
        display: 'flex', gap: '0.75rem',
        padding: '0.9rem 1rem',
        borderBottom: '1px solid var(--bd-faint)',
        textDecoration: 'none',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Col 1: avatar + thread line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
        <Avatar actor={event.actor} size={36} />
        <div style={{ width: 1, flex: 1, minHeight: 8, background: 'var(--bd-faint)' }} />
      </div>

      {/* Col 2: content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: '0.1rem' }}>

        {/* Name + verb + timestamp */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)',
            fontWeight: 700, color: 'var(--color-star)', letterSpacing: '0.04em',
          }}>
            {event.actor.name}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)' }}>
            {isMember ? 'joined the Collective' : verb}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.2)', marginLeft: 'auto', flexShrink: 0 }}>
            {event.ts}
          </span>
        </div>

        {/* Member join: role badge + socials */}
        {isMember && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
            {event.actor.socials?.map(s => (
              <span key={s.platform} onClick={e => e.preventDefault()} style={{
                fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.15em',
                color: 'var(--color-star-deep)', border: '1px solid var(--bd-faint)',
                padding: '0.1rem 0.45rem', cursor: 'pointer',
                transition: 'color 0.1s, border-color 0.1s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-star-dim)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,245,245,0.2)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-star-deep)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd-faint)' }}
              >
                {s.platform} ↗
              </span>
            ))}
          </div>
        )}

        {/* Title + thumbnail for non-member rows */}
        {!isMember && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Title — 2-line clamp */}
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)',
                color: 'var(--color-star)', lineHeight: 1.55, fontWeight: 500,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {event.title}
              </div>
              {/* Detail — desktop only */}
              {event.detail && (
                <div className="feed-detail" style={{
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
                  color: 'var(--color-star-dim)', marginTop: '0.3rem', lineHeight: 1.55,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {event.detail}
                </div>
              )}
            </div>
            {event.imageUrl && <Thumb url={event.imageUrl} />}
          </div>
        )}
      </div>
    </Link>
  )
}

// ─── Vote Group ───────────────────────────────────────────────────────────────

function VoteGroup({ events }: { events: FeedEvent[] }) {
  const [expanded, setExpanded] = useState(false)

  const opener = events.find(e => e.type === 'vote_open')
  const casts  = events.filter(e => e.type === 'vote_cast')

  const tally: Record<string, number> = {}
  for (const c of casts) {
    if (c.voteOption) tally[c.voteOption] = (tally[c.voteOption] ?? 0) + 1
  }
  const tallyEntries = Object.entries(tally).sort((a, b) => b[1] - a[1])

  // Names list for collapsed summary
  const nameList = casts.map(c => c.actor.name).join(', ')

  return (
    <div>
      {opener && <FeedRow event={opener} />}

      {/* Collapsed cast summary */}
      {!expanded && casts.length > 0 && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--bd-faint)',
            borderTop: '1px solid var(--bd-faint)',
            cursor: 'pointer', textAlign: 'left',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {/* Align to avatar column */}
          <div style={{ width: 36, flexShrink: 0 }}>
            {/* Overlapping mini-avatars */}
            <div style={{ display: 'flex' }}>
              {casts.slice(0, 4).map((c, i) => (
                <span key={c.id} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: casts.length - i, position: 'relative' }}>
                  <Avatar actor={c.actor} size={20} />
                </span>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Names */}
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
              color: 'var(--color-star-dim)', marginBottom: '0.2rem',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              <span style={{ color: '#20D890', fontWeight: 700 }}>{nameList}</span>
            </div>
            {/* Tally */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', lineHeight: 1.5 }}>
              {casts.length} votes cast
              <span className="feed-detail">
                {' · '}
                {tallyEntries.map(([opt, count], i) => (
                  <span key={opt}>{i > 0 && ' · '}{opt} ×{count}</span>
                ))}
              </span>
            </div>
          </div>

          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
            color: 'var(--color-star-deep)', flexShrink: 0, letterSpacing: '0.1em',
            paddingTop: '0.15rem',
          }}>
            EXPAND ▾
          </span>
        </button>
      )}

      {expanded && casts.map(e => <FeedRow key={e.id} event={e} />)}

      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          style={{
            width: '100%', padding: '0.4rem 1rem',
            background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--bd-faint)',
            borderTop: '1px solid var(--bd-faint)',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
            color: 'var(--color-star-deep)', textAlign: 'right', letterSpacing: '0.1em',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-star-dim)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-star-deep)')}
        >
          COLLAPSE ▴
        </button>
      )}
    </div>
  )
}

// ─── Display list builder ─────────────────────────────────────────────────────

type DisplayItem =
  | { kind: 'single'; event: FeedEvent }
  | { kind: 'group';  events: FeedEvent[] }

function buildDisplayList(events: FeedEvent[]): DisplayItem[] {
  const items: DisplayItem[] = []
  const groupMap: Record<string, FeedEvent[]> = {}
  for (const ev of events) {
    if (!ev.groupKey) {
      items.push({ kind: 'single', event: ev })
    } else {
      if (!groupMap[ev.groupKey]) {
        groupMap[ev.groupKey] = []
        items.push({ kind: 'group', events: groupMap[ev.groupKey] })
      }
      groupMap[ev.groupKey].push(ev)
    }
  }
  return items
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedDemoPage() {
  const displayList = buildDisplayList(MOCK_EVENTS)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-deep)', color: 'var(--color-star)', paddingBottom: '6rem' }}>
      <style>{`@media (max-width: 480px) { .feed-detail { display: none !important; } }`}</style>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Sticky header */}
        <div style={{
          padding: '1.25rem 1rem 0.75rem',
          borderBottom: '1px solid var(--bd-faint)',
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(10,14,39,0.92)', backdropFilter: 'blur(12px)',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.25em', color: 'var(--color-star-deep)', marginBottom: '0.3rem' }}>
            PC://CONSOLE / DASHBOARD
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--color-star)', letterSpacing: '0.18em' }}>
              LIVE FEED
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#20D890', boxShadow: '0 0 7px #20D890', display: 'inline-block' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', letterSpacing: '0.1em' }}>
                {new Date().toISOString().slice(0, 10).replace(/-/g, '.')}
              </span>
            </div>
          </div>
        </div>

        {/* Feed */}
        <div>
          {displayList.map((item, i) =>
            item.kind === 'single'
              ? <FeedRow key={item.event.id} event={item.event} />
              : <VoteGroup key={`group-${i}`} events={item.events} />
          )}
        </div>

        <div style={{
          padding: '1.5rem 1rem',
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
          color: 'var(--color-star-deep)', textAlign: 'center', letterSpacing: '0.15em',
        }}>
          — LAST 7 DAYS —
        </div>
      </div>
    </div>
  )
}
