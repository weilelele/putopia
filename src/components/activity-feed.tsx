'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ActivityEvent } from '@/lib/actions/activity-events'
import { getVoyagerById } from '@/lib/actions/profile'
import type { VoyagerProfile } from '@/types/database'

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

function formatDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10).replace(/-/g, '.')
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
    <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center' }}>
      {events.slice(0, 4).map((e, i) => (
        <div key={e.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: events.length - i, position: 'relative', display: 'block', lineHeight: 0 }}>
          <Avatar name={e.actor_name} role={e.actor_role} avatarUrl={e.actor_avatar_url} size={20} />
        </div>
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

function FeedRow({ event, onProfileOpen }: { event: ActivityEvent; onProfileOpen?: () => void }) {
  const isMember     = event.event_type === 'member_joined'
  const isActivation = event.event_type === 'voyager_activated'
  const isMatch      = event.event_type === 'device_matched'
  const socials  = (event.actor_socials ?? []) as { platform: string; url: string }[]

  const verb =
    event.event_type === 'intel_published'   ? 'published'           :
    event.event_type === 'intel_updated'     ? 'updated'             :
    event.event_type === 'device_updated'    ? 'updated'             :
    event.event_type === 'world_added'       ? 'logged'              :
    event.event_type === 'vote_opened'       ? 'opened a vote'       :
    event.event_type === 'vote_cast'         ? 'voted'               :
    event.event_type === 'voyager_activated' ? ''                     :
    event.event_type === 'device_matched'    ? 'matched a device'    :
    ''

  const verbColor  = (isActivation || isMatch) ? '#FF6B35' : 'var(--color-star-deep)'
  const verbWeight = (isActivation || isMatch) ? 700 : 400

  const useModal = !!(isActivation && onProfileOpen)

  const rowStyle: React.CSSProperties = {
    display: 'flex', gap: '0.75rem',
    padding: '0.9rem 1rem',
    borderBottom: '1px solid var(--bd-faint)',
    textDecoration: 'none',
    transition: 'background 0.1s',
    cursor: useModal ? 'pointer' : undefined,
  }

  const inner = (
    <>
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
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: verbColor, fontWeight: verbWeight }}>
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
                color: isActivation ? '#FF6B35' : 'var(--color-star)',
                lineHeight: 1.55, fontWeight: isActivation ? 600 : 500,
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
    </>
  )

  if (useModal) {
    return (
      <div
        style={rowStyle}
        onClick={onProfileOpen}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,53,0.04)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={event.target_href ?? '#'}
      style={rowStyle}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {inner}
    </Link>
  )
}

// ─── Vote group ───────────────────────────────────────────────────────────────

function VoteGroup({ casts }: { casts: ActivityEvent[] }) {
  const [expanded, setExpanded] = useState(false)

  const tally: Record<string, number> = {}
  for (const c of casts) {
    if (c.vote_option) tally[c.vote_option] = (tally[c.vote_option] ?? 0) + 1
  }
  const tallyEntries = Object.entries(tally).sort((a, b) => b[1] - a[1])
  const nameList = casts.map(c => c.actor_name).join(', ')

  return (
    <div>
      {/* Header is always visible — click anywhere to toggle expand/collapse */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
          padding: '0.75rem 1rem', background: expanded ? 'rgba(255,255,255,0.02)' : 'transparent',
          border: 'none', borderBottom: '1px solid var(--bd-faint)', borderTop: 'none',
          cursor: 'pointer', textAlign: 'left', outline: 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
        onMouseLeave={e => (e.currentTarget.style.background = expanded ? 'rgba(255,255,255,0.02)' : 'transparent')}
      >
        <AvatarStack events={casts} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#20D890', fontWeight: 700 }}>{nameList}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {casts[0]?.target_title ?? 'voted'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.2)' }}>
            {relTs(casts[0].created_at)}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', letterSpacing: '0.1em' }}>
            {expanded ? 'COLLAPSE ▴' : 'EXPAND ▾'}
          </span>
        </div>
      </button>

      {expanded && casts.map(e => <FeedRow key={e.id} event={e} />)}
    </div>
  )
}

// ─── Generic collapse group (Voyager activations / device matches) ─────────────

function CollapseGroup({ events, accent, summary }: { events: ActivityEvent[]; accent: string; summary: string }) {
  const [expanded, setExpanded] = useState(false)
  const names = [...new Set(events.map(e => e.actor_name))]
  const nameList = names.join(', ')

  return (
    <div>
      {/* Header is always visible — click anywhere to toggle expand/collapse */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
          padding: '0.75rem 1rem', background: expanded ? 'rgba(255,107,53,0.03)' : 'transparent',
          border: 'none', borderBottom: '1px solid var(--bd-faint)', borderTop: 'none',
          cursor: 'pointer', textAlign: 'left', outline: 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,53,0.04)')}
        onMouseLeave={e => (e.currentTarget.style.background = expanded ? 'rgba(255,107,53,0.03)' : 'transparent')}
      >
        <AvatarStack events={events} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: accent, fontWeight: 700 }}>{nameList}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', marginTop: '0.15rem' }}>
            {summary}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.2)' }}>
            {relTs(events[0].created_at)}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', letterSpacing: '0.1em' }}>
            {expanded ? 'COLLAPSE ▴' : 'EXPAND ▾'}
          </span>
        </div>
      </button>

      {expanded && events.map(e => <FeedRow key={e.id} event={e} />)}
    </div>
  )
}

// ─── Voyager quick-view modal ─────────────────────────────────────────────────

function VoyagerQuickView({ profile, onClose }: { profile: VoyagerProfile | null; onClose: () => void }) {
  if (!profile) return null

  const initials = profile.display_name.slice(0, 2).toUpperCase()
  const isArch   = profile.role === 'architect'
  const accent   = isArch ? '#FF6B35' : '#FF8A5C'

  const socials = [
    profile.social_x         && { label: 'X',        href: profile.social_x },
    profile.social_instagram && { label: 'INSTAGRAM', href: profile.social_instagram },
    profile.social_linkedin  && { label: 'LINKEDIN',  href: profile.social_linkedin },
  ].filter(Boolean) as { label: string; href: string }[]

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(5,8,18,0.82)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#0F1430', border: '1px solid rgba(255,107,53,0.35)', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', fontFamily: 'var(--font-mono)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(255,107,53,0.14)', background: '#090D1A' }}>
          <span style={{ color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.25em' }}>// VOYAGER PROFILE</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(245,245,245,0.35)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '2px 6px' }}>✕</button>
        </div>

        {/* Identity block */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '20px 18px 16px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
            border: `2px solid ${accent}55`, background: profile.avatar_url ? 'transparent' : `${accent}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: accent, fontSize: '1.4rem', fontWeight: 700,
          }}>
            {profile.avatar_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={profile.avatar_url} alt={profile.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '4px' }}>
              <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: '#F5F5F5', letterSpacing: '0.04em' }}>
                {profile.display_name}
              </span>
              <span style={{ fontSize: '0.6rem', padding: '2px 7px', border: `1px solid ${accent}55`, color: accent, letterSpacing: '0.15em', background: `${accent}0D` }}>
                {isArch ? 'ARCHITECT' : 'VOYAGER'}
              </span>
            </div>
            {profile.batch_label && (
              <div style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)', letterSpacing: '0.1em', marginBottom: '2px' }}>
                {profile.batch_label}
              </div>
            )}
            {profile.location && (
              <div style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)' }}>
                {profile.location}
              </div>
            )}
            <div style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.25)', marginTop: '2px' }}>
              joined {formatDate(profile.joined_at)}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', borderTop: '1px solid rgba(255,107,53,0.1)', borderBottom: '1px solid rgba(255,107,53,0.1)', margin: '0 18px' }}>
          <div style={{ flex: 1, textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#E85D04', textShadow: '0 0 10px rgba(232,93,4,0.35)' }}>
              {profile.observation_days}
            </div>
            <div style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.3)', letterSpacing: '0.1em', marginTop: '2px' }}>OBS DAYS</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,107,53,0.1)' }} />
          <div style={{ flex: 1, textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#20D890', textShadow: '0 0 10px rgba(32,216,144,0.25)' }}>
              {profile.worlds_discovered}
            </div>
            <div style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.3)', letterSpacing: '0.1em', marginTop: '2px' }}>WORLDS</div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div style={{ padding: '14px 18px', fontSize: 'var(--fs-label)', color: 'rgba(245,245,245,0.55)', lineHeight: 1.65 }}>
            {profile.bio}
          </div>
        )}

        {/* Footer: socials + See All */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid rgba(255,107,53,0.1)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {socials.map(s => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.6rem', letterSpacing: '0.15em', color: 'rgba(245,245,245,0.35)',
                  border: '1px solid rgba(255,107,53,0.2)', padding: '3px 8px', textDecoration: 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(245,245,245,0.65)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,245,245,0.35)')}
              >
                {s.label} ↗
              </a>
            ))}
          </div>
          <Link
            href="/voyagers"
            onClick={onClose}
            style={{
              fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', color: '#FF6B35',
              border: '1px solid rgba(255,107,53,0.45)', padding: '6px 14px',
              textDecoration: 'none', flexShrink: 0,
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,107,53,0.08)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            SEE ALL →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Loading modal placeholder ────────────────────────────────────────────────

function ProfileLoadingModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(5,8,18,0.82)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}
    >
      <div style={{ background: '#0F1430', border: '1px solid rgba(255,107,53,0.35)', width: '100%', maxWidth: '480px', padding: '48px 18px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'rgba(245,245,245,0.25)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em' }}>
        LOADING...
      </div>
    </div>
  )
}

// ─── Build display list ───────────────────────────────────────────────────────

type DisplayItem =
  | { kind: 'single'; event: ActivityEvent }
  | { kind: 'group'; groupType: string; events: ActivityEvent[] }

function buildDisplayList(events: ActivityEvent[]): DisplayItem[] {
  // Architects should never appear as "new Voyager" activations in the feed.
  const filtered = events.filter(ev =>
    !(ev.event_type === 'voyager_activated' && ev.actor_role === 'architect')
  )

  const items: DisplayItem[] = []
  const groups: Record<string, ActivityEvent[]> = {}

  for (const ev of filtered) {
    // Always-standalone rows (never grouped): vote_opened, and voyager_activated
    // (voyager identity changes should each show as their own row, not collapsed).
    if (!ev.group_key || ev.event_type === 'vote_opened' || ev.event_type === 'voyager_activated') {
      items.push({ kind: 'single', event: ev })
      continue
    }
    // grouped types (vote_cast / voyager_activated / device_matched): collect by group_key
    if (!groups[ev.group_key]) {
      groups[ev.group_key] = []
      items.push({ kind: 'group', groupType: ev.event_type, events: groups[ev.group_key] })
    }
    groups[ev.group_key].push(ev)
  }

  // Collapse single-event groups back into plain rows
  const normalized: DisplayItem[] = items.map(it =>
    it.kind === 'group' && it.events.length === 1
      ? { kind: 'single', event: it.events[0] }
      : it
  )

  // Sort by most-recent timestamp: groups use their newest event's time.
  // TTL filtering is handled server-side (per-type windows in getActivityFeed:
  // 7d for long-lived events, 12h for vote_cast and world_added).
  return normalized.sort((a, b) => {
    const tsA = a.kind === 'single' ? a.event.created_at : (a.events[0]?.created_at ?? '')
    const tsB = b.kind === 'single' ? b.event.created_at : (b.events[0]?.created_at ?? '')
    return tsB.localeCompare(tsA)
  })
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const [viewingProfile, setViewingProfile] = useState<VoyagerProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const openProfile = async (actorId: string) => {
    setProfileLoading(true)
    const profile = await getVoyagerById(actorId)
    setViewingProfile(profile)
    setProfileLoading(false)
  }

  const closeProfile = () => { setViewingProfile(null); setProfileLoading(false) }

  if (!events.length) return null

  const displayList = buildDisplayList(events)

  return (
    <>
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
              STATUS UPDATES
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)' }}>
            {new Date().toISOString().slice(0, 10).replace(/-/g, '.')}
          </span>
        </div>

        {/* Rows */}
        {displayList.map((item, i) => {
          if (item.kind === 'single') {
            const onProfileOpen = item.event.event_type === 'voyager_activated' && item.event.actor_id
              ? () => openProfile(item.event.actor_id!)
              : undefined
            return <FeedRow key={item.event.id} event={item.event} onProfileOpen={onProfileOpen} />
          }
          if (item.groupType === 'voyager_activated') {
            return (
              <CollapseGroup
                key={`group-${i}`}
                events={item.events}
                accent="#FF6B35"
                summary={`${item.events.length} new Voyagers activated · Cairo Batch 01`}
              />
            )
          }
          if (item.groupType === 'device_matched') {
            return (
              <CollapseGroup
                key={`group-${i}`}
                events={item.events}
                accent="#FF6B35"
                summary={`${item.events.length} devices matched & locked`}
              />
            )
          }
          return <VoteGroup key={`group-${i}`} casts={item.events} />
        })}
      </div>

      {/* Profile modal */}
      {profileLoading && <ProfileLoadingModal onClose={closeProfile} />}
      {!profileLoading && viewingProfile && <VoyagerQuickView profile={viewingProfile} onClose={closeProfile} />}
    </>
  )
}
