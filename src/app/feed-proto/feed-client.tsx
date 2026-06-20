'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { WorldPoster } from '@/components/world-poster'
import { getVoyagerById } from '@/lib/actions/profile'
import type { VoyagerProfile } from '@/types/database'

// ─── Shared types (also consumed by the server page) ──────────────────────────

export type Person = { name: string; initial: string; avatar?: string | null; option?: string; id?: string | null }

export type PosterWorld = {
  id: string
  name: string
  name_en?: string | null
  description?: string | null
  gradient_from?: string | null
  gradient_to?: string | null
  image_path?: string | null
  discoverer_name?: string | null
  discoverer_avatar_url?: string | null
}

export type FeedItem = {
  id: string
  kind: 'info' | 'world' | 'device' | 'member'
  color: string
  eyebrow: string
  label?: string
  title: string
  snippet?: string
  image?: string | null
  actor?: Person | null
  href: string
  time: string
  established?: boolean
  world?: PosterWorld
}

export type VoteCard = {
  id: string
  title: string
  options: string[]
  voters: Person[]
  count: number
  ends: string
  time: string
}

export type FeedEntry =
  | { kind: 'content'; item: FeedItem }
  | { kind: 'vote'; vote: VoteCard }

const ORANGE = '#FF6B35'
const LORANGE = '#FF8A5C'
const AMBER = '#FFB020'
const GREEN = '#20D890'
const BURNT = '#E85D04'
// Font tokens — never below --fs-caption (12px floor).
const FS_LABEL = 'var(--fs-label)'      // 13
const FS_CAPTION = 'var(--fs-caption)'  // 12

// ─── Atoms ────────────────────────────────────────────────────────────────────

function Avatar({ p, size = 20 }: { p: Person; size?: number }) {
  if (p.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={p.avatar} alt="" loading="lazy" decoding="async" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />
    )
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: BURNT, color: '#0A0E27', fontWeight: 700, fontSize: Math.max(12, Math.round(size * 0.42)), fontFamily: 'var(--font-mono)',
    }}>{p.initial}</span>
  )
}

function Cover({ src }: { src: string }) {
  // Fixed 3:2 banner so square / portrait images don't blow up the card height.
  // Show a placeholder block first, then fade the image in once it decodes — and
  // lazy-load so off-screen covers never block the initial paint.
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={loaded ? undefined : 'feed-skel'} style={{ width: '100%', aspectRatio: '3 / 2', overflow: 'hidden', background: 'var(--color-void)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.85) saturate(0.85)', opacity: loaded ? 1 : 0, transition: 'opacity 0.35s ease' }}
      />
    </div>
  )
}

function Footer({ actor, time, align = 'space-between' }: { actor?: Person | null; time: string; align?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: align, marginTop: 10 }}>
      {actor ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Avatar p={actor} size={18} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{actor.name}</span>
        </span>
      ) : <span />}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.35)', flexShrink: 0, marginLeft: 6 }}>{time}</span>
    </div>
  )
}

// ─── Content card (info / device / member) — navigates to the real route ──────

function ContentCard({ item, onMember }: { item: FeedItem; onMember?: (item: FeedItem) => void }) {
  if (item.kind === 'world' && item.world) {
    return (
      <div style={{ breakInside: 'avoid', marginBottom: 11 }}>
        <WorldPoster
          world={item.world}
          eyebrow={item.eyebrow}
          eyebrowColor={item.established ? LORANGE : AMBER}
          eyebrowStyle={{ whiteSpace: 'nowrap', letterSpacing: '0.06em' }}
          date={item.time}
          descLines={3}
          minHeight={166}
          hoverBorder="rgba(255,176,32,0.4)"
          orangeMask={item.established}
          noBorder
        />
      </div>
    )
  }

  const isMember = item.kind === 'member'
  const hasImage = !!item.image
  // Text-only cards (no cover, not a member portrait) used to collapse to a
  // squat block when the copy was short. Give them a floor height and let flex
  // spacers open up breathing room — biased toward the top — when content is thin.
  const textOnly = !hasImage && !isMember
  // A new-voyager card opens an intro popup for that person rather than jumping
  // straight to the roster — restoring the old dashboard's quick-view step.
  const opensIntro = isMember && !!item.actor?.id && !!onMember

  const cardStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', textDecoration: 'none', breakInside: 'avoid', marginBottom: 11,
    background: 'var(--color-void)', borderRadius: 3, overflow: 'hidden',
    ...(textOnly ? { minHeight: 178 } : {}),
  }

  const inner = (
    <>
      {hasImage && !isMember && <Cover src={item.image as string} />}

      {isMember && item.actor && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14 }}>
          <Avatar p={item.actor} size={54} />
        </div>
      )}

      <div style={{ padding: '10px 11px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {textOnly && <div style={{ flex: '1.6 1 0', minHeight: 6 }} />}

        {item.label && !isMember && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, letterSpacing: '0.06em', color: item.color, marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.label}
          </div>
        )}

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: FS_LABEL, fontWeight: 700, lineHeight: 1.38, color: item.color, textAlign: isMember ? 'center' : 'left' }}>
          {item.title}
        </div>

        {!isMember && item.snippet && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, lineHeight: 1.5, color: 'rgba(245,245,245,0.5)',
            marginTop: 7, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{item.snippet}</div>
        )}

        {textOnly && <div style={{ flex: '1 1 0', minHeight: 6 }} />}

        {isMember
          ? <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.35)' }}>{item.time}</span></div>
          : <Footer actor={item.actor} time={item.time} />}
      </div>
    </>
  )

  if (opensIntro) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onMember!(item)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMember!(item) } }}
        style={{ ...cardStyle, cursor: 'pointer' }}
      >
        {inner}
      </div>
    )
  }

  return (
    <Link href={item.href} style={cardStyle}>
      {inner}
    </Link>
  )
}

// ─── Vote card — recent voters listed line by line + solid CTA ────────────────

function VoteTofu({ vote, onVote }: { vote: VoteCard; onVote: () => void }) {
  const shown = vote.voters.slice(0, 5)
  return (
    <div
      onClick={onVote}
      style={{
        breakInside: 'avoid', marginBottom: 11, background: '#1A1107',
        borderRadius: 3, overflow: 'hidden', cursor: 'pointer', padding: '11px 12px',
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: FS_LABEL, fontWeight: 700, lineHeight: 1.38, color: LORANGE }}>{vote.title}</div>

      {shown.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {shown.map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <Avatar p={v} size={20} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.8)', flexShrink: 0 }}>{v.name}</span>
              {v.option && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>· {v.option}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 11, background: ORANGE, color: '#0A0E27', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: FS_LABEL, letterSpacing: '0.08em', whiteSpace: 'nowrap', padding: '11px 0', borderRadius: 2 }}>
        MAKE A DECISION
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.35)', whiteSpace: 'nowrap', marginTop: 9 }}>
        {vote.count} votes · {vote.ends}
      </div>
    </div>
  )
}

// ─── Vote modal ───────────────────────────────────────────────────────────────

function VoteModal({ vote, onClose }: { vote: VoteCard; onClose: () => void }) {
  const [picked, setPicked] = useState(0)
  const [cast, setCast] = useState(false)
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(5,8,20,0.74)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
    >
      <div style={{ background: 'var(--color-void)', border: `1px solid ${LORANGE}`, borderRadius: 6, padding: 16, width: '100%', maxWidth: 380 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: FS_LABEL, fontWeight: 700, lineHeight: 1.4, color: LORANGE, marginBottom: 14 }}>{vote.title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {vote.options.map((o, i) => {
            const on = i === picked
            return (
              <div key={i} onClick={() => setPicked(i)} style={{
                border: `1px solid ${on ? ORANGE : 'rgba(245,245,245,0.12)'}`, background: on ? 'rgba(255,107,53,0.12)' : 'transparent',
                borderRadius: 3, padding: '9px 10px', color: on ? LORANGE : 'rgba(245,245,245,0.6)', fontFamily: 'var(--font-mono)',
                fontSize: FS_CAPTION, lineHeight: 1.4, display: 'flex', justifyContent: 'space-between', gap: 8, cursor: 'pointer',
              }}>
                <span>{o}</span><span>{on ? '◉' : '○'}</span>
              </div>
            )
          })}
        </div>
        <div
          onClick={() => { setCast(true); setTimeout(onClose, 800) }}
          style={{ marginTop: 14, background: cast ? GREEN : ORANGE, color: '#0A0E27', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: FS_CAPTION, letterSpacing: '0.15em', padding: 11, borderRadius: 3, cursor: 'pointer' }}
        >{cast ? '✓ DECISION MADE' : 'MAKE A DECISION'}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, textAlign: 'center', color: 'rgba(245,245,245,0.35)', marginTop: 10 }}>{vote.count} signals in · {vote.ends}</div>
      </div>
    </div>
  )
}

// ─── Voyager intro modal ──────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 10).replace(/-/g, '.')
}

function VoyagerIntroModal({ person, onClose }: { person: Person; onClose: () => void }) {
  const [profile, setProfile] = useState<VoyagerProfile | null>(null)
  const [loading, setLoading] = useState(!!person.id)

  useEffect(() => {
    if (!person.id) return
    let live = true
    getVoyagerById(person.id).then(p => { if (live) { setProfile(p); setLoading(false) } })
    return () => { live = false }
  }, [person.id])

  const isArch = profile?.role === 'architect'
  const accent = isArch ? ORANGE : LORANGE
  const name = profile?.display_name ?? person.name
  const initials = (name ?? '').slice(0, 2).toUpperCase()
  const avatar = profile?.avatar_url ?? person.avatar ?? null

  const socials = ([
    profile?.social_x && { label: 'X', href: profile.social_x },
    profile?.social_instagram && { label: 'INSTAGRAM', href: profile.social_instagram },
    profile?.social_linkedin && { label: 'LINKEDIN', href: profile.social_linkedin },
  ].filter(Boolean)) as { label: string; href: string }[]

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(5,8,18,0.82)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ background: '#0F1430', border: `1px solid ${accent}59`, borderRadius: 6, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', fontFamily: 'var(--font-mono)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(255,107,53,0.14)', background: '#090D1A' }}>
          <span style={{ color: 'rgba(245,245,245,0.35)', fontSize: FS_CAPTION, letterSpacing: '0.25em' }}>{'// VOYAGER PROFILE'}</span>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'rgba(245,245,245,0.35)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '2px 6px' }}>✕</button>
        </div>

        {/* Identity */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '20px 18px 16px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
            border: `2px solid ${accent}55`, background: avatar ? 'transparent' : `${accent}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, fontSize: '1.4rem', fontWeight: 700,
          }}>
            {avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: FS_LABEL, fontWeight: 700, color: '#F5F5F5', letterSpacing: '0.04em' }}>{name}</span>
              <span style={{ fontSize: FS_CAPTION, padding: '2px 7px', border: `1px solid ${accent}55`, color: accent, letterSpacing: '0.15em', background: `${accent}0D` }}>
                {isArch ? 'ARCHITECT' : 'VOYAGER'}
              </span>
            </div>
            {profile?.batch_label && <div style={{ fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.35)', letterSpacing: '0.1em', marginBottom: 2 }}>{profile.batch_label}</div>}
            {profile?.location && <div style={{ fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.35)' }}>{profile.location}</div>}
            {profile?.joined_at && <div style={{ fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.25)', marginTop: 2 }}>joined {fmtDate(profile.joined_at)}</div>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', borderTop: '1px solid rgba(255,107,53,0.1)', borderBottom: '1px solid rgba(255,107,53,0.1)', margin: '0 18px' }}>
          <div style={{ flex: 1, textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#E85D04', textShadow: '0 0 10px rgba(232,93,4,0.35)' }}>{profile?.observation_days ?? '—'}</div>
            <div style={{ fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.3)', letterSpacing: '0.1em', marginTop: 2 }}>OBS DAYS</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,107,53,0.1)' }} />
          <div style={{ flex: 1, textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: GREEN, textShadow: '0 0 10px rgba(32,216,144,0.25)' }}>{profile?.worlds_discovered ?? '—'}</div>
            <div style={{ fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.3)', letterSpacing: '0.1em', marginTop: 2 }}>WORLDS</div>
          </div>
        </div>

        {/* Bio */}
        {loading
          ? <div style={{ padding: '14px 18px', fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.35)' }}>Loading profile…</div>
          : profile?.bio && <div style={{ padding: '14px 18px', fontSize: FS_LABEL, color: 'rgba(245,245,245,0.55)', lineHeight: 1.65 }}>{profile.bio}</div>}

        {/* Footer: socials + proceed */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 18px', borderTop: '1px solid rgba(255,107,53,0.1)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {socials.map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: FS_CAPTION, letterSpacing: '0.15em', color: 'rgba(245,245,245,0.35)', border: '1px solid rgba(255,107,53,0.2)', padding: '3px 8px', textDecoration: 'none' }}>
                {s.label} ↗
              </a>
            ))}
          </div>
          <Link href="/voyagers" onClick={onClose}
            style={{ fontSize: FS_CAPTION, letterSpacing: '0.12em', color: ORANGE, border: '1px solid rgba(255,107,53,0.45)', padding: '6px 14px', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>
            SEE ALL →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Page client ──────────────────────────────────────────────────────────────

export function FeedProtoClient({ entries, embedded = false, leadSlot }: { entries: FeedEntry[]; embedded?: boolean; leadSlot?: ReactNode }) {
  // Track the specific vote that was clicked — every vote must open its own
  // options, not the first vote's.
  const [activeVote, setActiveVote] = useState<VoteCard | null>(null)
  // The new-voyager whose intro popup is open (null = none).
  const [activeVoyager, setActiveVoyager] = useState<Person | null>(null)

  const outer = embedded
    ? { color: 'var(--color-star)' as const }
    : { height: '100dvh', overflowY: 'auto' as const, background: 'var(--color-deep)', color: 'var(--color-star)' }

  return (
    <div style={outer}>
      {/* Skeleton shimmer for image placeholders — inlined so it ships without
          depending on globals.css (which the dev server's CSS HMR misses). */}
      <style>{`
        .feed-skel { background-image: linear-gradient(100deg, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.02) 70%); background-size: 200% 100%; animation: feed-skel-shimmer 1.4s ease-in-out infinite; }
        @keyframes feed-skel-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        {embedded ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0 6px 14px' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, fontWeight: 700, letterSpacing: '0.3em', color: ORANGE }}>INTERNAL UPDATES</span>
            <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px',
            borderBottom: '1px solid #161c30', position: 'sticky', top: 0, zIndex: 10,
            background: 'rgba(10,14,39,0.92)', backdropFilter: 'blur(12px)',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, fontWeight: 700, letterSpacing: '0.24em', color: ORANGE }}>INTERNAL UPDATES</span>
            <span style={{ color: 'rgba(245,245,245,0.35)', fontSize: FS_LABEL }}>⌖</span>
          </div>
        )}

        <div style={{ padding: embedded ? 0 : 10, columnCount: 2, columnGap: 8 }}>
          {leadSlot && (
            <div style={{ breakInside: 'avoid', marginBottom: 11 }}>{leadSlot}</div>
          )}
          {entries.map(e => e.kind === 'vote'
            ? <VoteTofu key={`vote-${e.vote.id}`} vote={e.vote} onVote={() => setActiveVote(e.vote)} />
            : <ContentCard key={e.item.id} item={e.item} onMember={it => setActiveVoyager(it.actor ?? null)} />)}
        </div>

        {!embedded && (
          <div style={{ textAlign: 'center', color: 'rgba(245,245,245,0.25)', fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, padding: '12px 0 96px', letterSpacing: '0.2em' }}>
            ↓ END OF SIGNAL WINDOW
          </div>
        )}
      </div>

      {activeVote && <VoteModal vote={activeVote} onClose={() => setActiveVote(null)} />}
      {activeVoyager && <VoyagerIntroModal person={activeVoyager} onClose={() => setActiveVoyager(null)} />}
    </div>
  )
}
