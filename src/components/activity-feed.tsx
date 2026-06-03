'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ActivityEvent } from '@/lib/actions/activity-events'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTs(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 2)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, role, avatarUrl, size = 36 }: { name: string; role: string; avatarUrl?: string | null; size?: number }) {
  const initials = name.slice(0, 2).toUpperCase()
  const isArch   = role === 'architect'
  const color    = isArch ? '#FF6B35' : '#FF8A5C'
  const border   = isArch ? 'rgba(255,107,53,0.55)' : 'rgba(255,138,92,0.4)'

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt={name} style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        border: `1.5px solid ${border}`, objectFit: 'cover', display: 'block',
      }} />
    )
  }

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

function AvatarStack({ events }: { events: ActivityEvent[] }) {
  return (
    <div style={{ display: 'flex', width: 36, justifyContent: 'flex-start' }}>
      {events.slice(0, 4).map((e, i) => (
        <span key={e.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: events.length - i, position: 'relative' }}>
          <Avatar name={e.actor_name} role={e.actor_role} avatarUrl={e.actor_avatar_url} size={20} />
        </span>
      ))}
    </div>
  )
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────

function Thumb({ url }: { url: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" style={{
      width: 120, height: 90, objectFit: 'cover', flexShrink: 0, display: 'block',
      border: '1px solid rgba(245,245,245,0.08)',
      filter: 'brightness(0.82) saturate(0.65)',
    }} />
  )
}

// ─── Single row ───────────────────────────────────────────────────────────────

function FeedRow({ event }: { event: ActivityEvent }) {
  const isMember = event.event_type === 'member_joined'
  const socials  = (event.actor_socials ?? []) as { platform: string; url: string }[]

  const verb =
    event.event_type === 'intel_published' ? 'published'        :
    event.event_type === 'intel_updated'   ? 'updated'          :
    event.event_type === 'device_updated'  ? 'updated'          :
    event.event_type === 'world_added'     ? 'logged'           :
    event.event_type === 'vote_opened'     ? 'opened a vote'    :
    event.event_type === 'vote_cast'       ? 'voted'            :
    ''

  return (
    <Link
      href={event.target_href ?? '#'}
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
      {/* Avatar + thread line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
        <Avatar name={event.actor_name} role={event.actor_role} avatarUrl={event.actor_avatar_url} size={36} />
        <div style={{ width: 1, flex: 1, minHeight: 8, background: 'var(--bd-faint)' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: '0.1rem', textAlign: 'left' }}>

        {/* Name · verb · time */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--color-star)', letterSpacing: '0.04em' }}>
            {event.actor_name}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)' }}>
            {isMember ? 'joined the Collective' : verb}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.2)', marginLeft: 'auto', flexShrink: 0 }}>
            {relTs(event.created_at)}
          </span>
        </div>

        {/* Member join: optional socials */}
        {isMember && socials.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
            {socials.map(s => (
              <span
                key={s.platform}
                onClick={e => { e.preventDefault(); window.open(s.url, '_blank') }}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.15em',
                  color: 'var(--color-star-deep)', border: '1px solid var(--bd-faint)',
                  padding: '0.1rem 0.45rem', cursor: 'pointer',
                }}
              >
                {s.platform} ↗
              </span>
            ))}
          </div>
        )}

        {/* Title + thumbnail */}
        {!isMember && event.target_title && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)',
                color: 'var(--color-star)', lineHeight: 1.55, fontWeight: 500,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {event.target_title}
              </div>
              {event.vote_option && (
                <div className="feed-detail" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)', marginTop: '0.25rem' }}>
                  → {event.vote_option}
                </div>
              )}
            </div>
            {event.target_image && <Thumb url={event.target_image} />}
          </div>
        )}
      </div>
    </Link>
  )
}

// ─── Vote group ───────────────────────────────────────────────────────────────

function VoteGroup({ opener, casts }: { opener: ActivityEvent | undefined; casts: ActivityEvent[] }) {
  const [expanded, setExpanded] = useState(false)

  const tally: Record<string, number> = {}
  for (const c of casts) {
    if (c.vote_option) tally[c.vote_option] = (tally[c.vote_option] ?? 0) + 1
  }
  const tallyEntries = Object.entries(tally).sort((a, b) => b[1] - a[1])
  const nameList = casts.map(c => c.actor_name).join(', ')

  return (
    <div>
      {opener && <FeedRow event={opener} />}

      {!expanded && casts.length > 0 && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            padding: '0.75rem 1rem', background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--bd-faint)',
            borderTop: opener ? '1px solid var(--bd-faint)' : 'none',
            cursor: 'pointer', textAlign: 'left',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <AvatarStack events={casts} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#20D890', fontWeight: 700 }}>{nameList}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', marginTop: '0.15rem' }}>
              {casts.length} votes cast
              <span className="feed-detail">
                {' · '}
                {tallyEntries.map(([opt, count], i) => (
                  <span key={opt}>{i > 0 && ' · '}{opt} ×{count}</span>
                ))}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.2)' }}>
              {relTs(casts[0].created_at)}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', letterSpacing: '0.1em' }}>
              EXPAND ▾
            </span>
          </div>
        </button>
      )}

      {expanded && casts.map(e => <FeedRow key={e.id} event={e} />)}

      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          style={{
            width: '100%', padding: '0.4rem 1rem', background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--bd-faint)', borderTop: '1px solid var(--bd-faint)',
            cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
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

// ─── Build display list ───────────────────────────────────────────────────────

type DisplayItem =
  | { kind: 'single'; event: ActivityEvent }
  | { kind: 'group'; opener: ActivityEvent | undefined; casts: ActivityEvent[] }

function buildDisplayList(events: ActivityEvent[]): DisplayItem[] {
  const items: DisplayItem[] = []
  const groups: Record<string, { opener?: ActivityEvent; casts: ActivityEvent[] }> = {}

  for (const ev of events) {
    if (!ev.group_key) {
      items.push({ kind: 'single', event: ev })
      continue
    }
    if (!groups[ev.group_key]) {
      groups[ev.group_key] = { casts: [] }
      items.push({ kind: 'group', opener: undefined, casts: groups[ev.group_key].casts })
    }
    const key = ev.group_key
    if (ev.event_type === 'vote_opened') {
      groups[key].opener = ev
      const item = items.find(i => i.kind === 'group' && i.casts === groups[key].casts)
      if (item && item.kind === 'group') item.opener = ev
    } else {
      groups[key].casts.push(ev)
    }
  }

  // Sort by most-recent timestamp: groups use their newest cast (or opener if no casts)
  return items.sort((a, b) => {
    const tsA = a.kind === 'single'
      ? a.event.created_at
      : (a.casts[0]?.created_at ?? a.opener?.created_at ?? '')
    const tsB = b.kind === 'single'
      ? b.event.created_at
      : (b.casts[0]?.created_at ?? b.opener?.created_at ?? '')
    return tsB.localeCompare(tsA)
  })
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (!events.length) return null

  const displayList = buildDisplayList(events)

  return (
    <div style={{ border: '1px solid var(--bd-faint)', background: 'var(--color-void)' }}>
      <style>{`@media (max-width: 480px) { .feed-detail { display: none !important; } }`}</style>

      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.5rem 1rem', borderBottom: '1px solid var(--bd-faint)',
        background: '#090D1A',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#20D890', boxShadow: '0 0 6px #20D890', display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'var(--color-star-dim)' }}>
            LIVE FEED
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)' }}>
          {new Date().toISOString().slice(0, 10).replace(/-/g, '.')}
        </span>
      </div>

      {/* Rows */}
      {displayList.map((item, i) =>
        item.kind === 'single'
          ? <FeedRow key={item.event.id} event={item.event} />
          : <VoteGroup key={`group-${i}`} opener={item.opener} casts={item.casts} />
      )}
    </div>
  )
}
