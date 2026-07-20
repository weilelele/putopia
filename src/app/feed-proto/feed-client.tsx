'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MessageSquare, Radio } from 'lucide-react'
import Link from 'next/link'
import { WorldPoster } from '@/components/world-poster'
import SmartImage from '@/components/smart-image'
import { getVoyagerById } from '@/lib/actions/profile'
import { submitVoteResponse, getMyVoteResponses } from '@/lib/actions/votes'
import type { VoyagerProfile } from '@/types/database'

// ─── Vote persistence helpers ─────────────────────────────────────────────────
// A vote is final once cast. We track the viewer's choice two ways: a stable
// per-browser anon token (so guests are deduped server-side via the
// unique(vote_id, anon_token) constraint) and a localStorage record of what this
// browser picked (instant "you voted X" without a round-trip). Authed viewers are
// also reconciled against the server (getMyVoteResponses) when the modal opens.
const ANON_KEY = 'putopia-anon-id'
const VOTED_KEY = 'putopia-voted'

function getAnonToken(): string {
  try {
    let t = localStorage.getItem(ANON_KEY)
    if (!t) { t = crypto.randomUUID(); localStorage.setItem(ANON_KEY, t) }
    return t
  } catch { return '' }
}
function readVotedMap(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(VOTED_KEY) || '{}') as Record<string, string[]> } catch { return {} }
}
function recordVoted(voteId: string, selected: string[]) {
  try {
    const m = readVotedMap()
    m[voteId] = selected
    localStorage.setItem(VOTED_KEY, JSON.stringify(m))
  } catch { /* private mode / quota — server constraint is still the source of truth */ }
}

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

// Bottom-right engagement metric: an icon + count, not a worded label.
export type FeedStat = { kind: 'comment' | 'signal'; count: number }

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
  // Highest-priority quantitative metric for the bottom-right, shown as an icon +
  // count (comments / dispatch signals). Null/absent → the card falls back to
  // showing `time`.
  stat?: FeedStat | null
  established?: boolean
  world?: PosterWorld
  // Voyager-only intel the current viewer cannot see: body/image/byline are
  // stripped server-side; the client renders a cover + gate modal on tap.
  locked?: boolean
}

export type VoteCard = {
  id: string
  title: string
  options: string[]
  // Option {id,label} pairs — needed to record a response and highlight the
  // viewer's prior pick (vote_responses stores option IDs, not labels).
  choices: { id: string; label: string }[]
  multi: boolean
  voters: Person[]
  count: number
  ends: string
  time: string
  // Voyager-only vote the current viewer cannot see: options/voters stripped
  // server-side; the client renders a cover + gate modal on tap.
  locked?: boolean
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

// Renders children into document.body, escaping any ancestor that establishes a
// containing block for fixed-position elements (e.g. the AccessGate's
// `filter: blur(...)` frost). Without this, modals below such an ancestor are
// positioned relative to that element instead of the viewport — the backdrop
// covers only the frosted region and the centered card lands off-screen.
function Portal({ children }: { children: ReactNode }) {
  // Modals only render after a client interaction (their state starts null), so
  // this never runs during SSR; the guard is just belt-and-suspenders.
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function Avatar({ p, size = 20 }: { p: Person; size?: number }) {
  if (p.avatar) {
    return (
      <SmartImage src={p.avatar} alt="" sizes={`${size}px`} width={size} height={size} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />
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
    <div className={loaded ? undefined : 'feed-skel'} style={{ width: '100%', aspectRatio: '3 / 2', overflow: 'hidden', background: 'var(--color-void)', position: 'relative' }}>
      <SmartImage
        src={src}
        alt=""
        sizes="(min-width: 768px) 600px, 100vw"
        onLoad={() => setLoaded(true)}
        style={{ objectFit: 'cover', filter: 'brightness(0.85) saturate(0.85)', opacity: loaded ? 1 : 0, transition: 'opacity 0.35s ease' }}
      />
    </div>
  )
}

// Engagement metric as an icon + count (never a worded label). The count uses
// the same muted tone as the timestamp it replaces.
function StatBadge({ stat }: { stat: FeedStat }) {
  const Icon = stat.kind === 'comment' ? MessageSquare : Radio
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.4)' }}>
      <Icon size={12} strokeWidth={1.75} aria-hidden style={{ flexShrink: 0 }} />
      {stat.count}
    </span>
  )
}

// Bottom-right content: the engagement metric (icon + count) when present,
// otherwise the timestamp.
function statOrTime(item: FeedItem): ReactNode {
  return item.stat ? <StatBadge stat={item.stat} /> : item.time
}

function Footer({ actor, time, align = 'space-between' }: { actor?: Person | null; time: ReactNode; align?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: align, marginTop: 10 }}>
      {actor ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Avatar p={actor} size={18} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{actor.name}</span>
        </span>
      ) : <span />}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.35)', flexShrink: 0, marginLeft: 6, display: 'inline-flex', alignItems: 'center' }}>{time}</span>
    </div>
  )
}

// ─── Voyager-only cover — sits where the gated body would be ──────────────────

function VoyagerOnlyCover({ minHeight = 54 }: { minHeight?: number }) {
  return (
    <div style={{
      marginTop: 8, minHeight, borderRadius: 3,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      background: 'repeating-linear-gradient(45deg, rgba(255,107,53,0.12) 0 9px, rgba(255,107,53,0.03) 9px 18px)',
      border: '1px solid rgba(255,107,53,0.22)',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, fontWeight: 700, letterSpacing: '0.2em', color: ORANGE }}>VOYAGER ONLY</span>
    </div>
  )
}

// ─── Content card (info / device / member) — navigates to the real route ──────

function ContentCard({ item, onMember, onLocked }: { item: FeedItem; onMember?: (item: FeedItem) => void; onLocked?: (item: FeedItem) => void }) {
  if (item.kind === 'world' && item.world) {
    return (
      <div style={{ breakInside: 'avoid', marginBottom: 11 }}>
        <WorldPoster
          world={item.world}
          eyebrow={item.eyebrow}
          eyebrowColor={item.established ? LORANGE : AMBER}
          eyebrowStyle={{ whiteSpace: 'nowrap', letterSpacing: '0.06em' }}
          date={statOrTime(item)}
          descLines={2}
          minHeight={166}
          hoverBorder="rgba(255,176,32,0.4)"
          orangeMask={item.established}
          noBorder
        />
      </div>
    )
  }

  const isMember = item.kind === 'member'
  const isLocked = !!item.locked
  const hasImage = !!item.image
  // Text-only cards (no cover, not a member portrait) used to collapse to a
  // squat block when the copy was short. Give them a floor height and let flex
  // spacers open up breathing room — biased toward the top — when content is thin.
  const textOnly = !hasImage && !isMember
  // A new-voyager card opens an intro popup for that person rather than jumping
  // straight to the roster — restoring the old dashboard's quick-view step.
  // Gate only on the card being a member with an actor present; we deliberately
  // do NOT require actor.id, so a payload missing the id still opens the popup
  // (the modal fetches the full profile when an id exists and degrades to the
  // card's own name/avatar when it doesn't) rather than silently falling through
  // to the roster link.
  const opensIntro = isMember && !!item.actor && !!onMember

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

        {isMember && item.actor?.name && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: FS_LABEL, fontWeight: 700, lineHeight: 1.3, color: 'var(--color-star)', textAlign: 'center', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.actor.name}
          </div>
        )}

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: isMember ? FS_CAPTION : FS_LABEL, fontWeight: isMember ? 400 : 700, lineHeight: 1.38, color: item.color, textAlign: isMember ? 'center' : 'left' }}>
          {item.title}
        </div>

        {!isMember && item.snippet && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, lineHeight: 1.5, color: 'rgba(245,245,245,0.5)',
            marginTop: 7, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{item.snippet}</div>
        )}

        {isLocked && <VoyagerOnlyCover />}

        {textOnly && <div style={{ flex: '1 1 0', minHeight: 6 }} />}

        {isMember
          ? <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.35)' }}>{item.time}</span></div>
          : <Footer actor={item.actor} time={statOrTime(item)} />}
      </div>
    </>
  )

  // Gated intel: tap opens the Voyager gate modal instead of the (RLS-blocked)
  // detail route. Takes precedence over the member-intro branch (mutually
  // exclusive in practice — members are never gated).
  if (isLocked) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onLocked?.(item)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLocked?.(item) } }}
        style={{ ...cardStyle, cursor: 'pointer' }}
      >
        {inner}
      </div>
    )
  }

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

function VoteTofu({ vote, onVote, onLocked, onSignIn, canVote = true }: { vote: VoteCard; onVote: () => void; onLocked?: () => void; onSignIn?: () => void; canVote?: boolean }) {
  const shown = vote.voters.slice(0, 5)
  // This browser's recorded vote (client-only; the card never SSRs since feed
  // entries are client-loaded). Authed cross-device state surfaces in the modal.
  const [voted] = useState<boolean>(() => (readVotedMap()[vote.id]?.length ?? 0) > 0)
  // Guests must sign in before casting a ballot; a tap routes to the sign-in gate
  // (taking priority over both the ballot and the Voyager-only gate).
  const tap = !canVote ? () => onSignIn?.() : (vote.locked ? () => onLocked?.() : onVote)

  // Voyager-only vote the viewer can't participate in: title teaser + cover,
  // tap opens the gate modal. Options/voters/tallies were stripped server-side.
  if (vote.locked) {
    return (
      <div
        onClick={tap}
        style={{
          breakInside: 'avoid', marginBottom: 11, background: '#1A1107',
          borderRadius: 3, overflow: 'hidden', cursor: 'pointer', padding: '11px 12px',
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, fontWeight: 700, letterSpacing: '0.18em', color: ORANGE, marginBottom: 5 }}>VOTE</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: FS_LABEL, fontWeight: 700, lineHeight: 1.38, color: LORANGE }}>{vote.title}</div>
        <VoyagerOnlyCover minHeight={64} />
      </div>
    )
  }

  return (
    <div
      onClick={tap}
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

      {!canVote ? (
        <div style={{ marginTop: 11, background: ORANGE, color: '#0A0E27', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: FS_LABEL, letterSpacing: '0.08em', whiteSpace: 'nowrap', padding: '11px 0', borderRadius: 2 }}>
          SIGN IN TO VOTE
        </div>
      ) : voted ? (
        <div style={{ marginTop: 11, border: `1px solid ${GREEN}`, color: GREEN, textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: FS_LABEL, letterSpacing: '0.08em', whiteSpace: 'nowrap', padding: '10px 0', borderRadius: 2 }}>
          ✓ YOU VOTED
        </div>
      ) : (
        <div style={{ marginTop: 11, background: ORANGE, color: '#0A0E27', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: FS_LABEL, letterSpacing: '0.08em', whiteSpace: 'nowrap', padding: '11px 0', borderRadius: 2 }}>
          MAKE A DECISION
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.35)', whiteSpace: 'nowrap', marginTop: 9 }}>
        <Radio size={12} strokeWidth={1.75} aria-hidden style={{ flexShrink: 0 }} />
        {vote.count} · {vote.ends}
      </div>
    </div>
  )
}

// ─── Vote modal ───────────────────────────────────────────────────────────────

function VoteModal({ vote, onClose }: { vote: VoteCard; onClose: () => void }) {
  // Seed from this browser's record (instant); reconcile with the server below.
  const [selected, setSelected] = useState<string[]>(() => readVotedMap()[vote.id] ?? [])
  const [voted, setVoted] = useState<boolean>(() => (readVotedMap()[vote.id]?.length ?? 0) > 0)
  const [count, setCount] = useState(vote.count)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Signed-in viewers: pull the authoritative prior response (covers a vote cast
  // on another device, which localStorage can't know about). Guests get [].
  useEffect(() => {
    let live = true
    getMyVoteResponses().then(rows => {
      if (!live) return
      const mine = rows.find(r => r.vote_id === vote.id)
      if (mine && Array.isArray(mine.selected_options) && mine.selected_options.length) {
        setSelected(mine.selected_options as string[])
        setVoted(true)
        recordVoted(vote.id, mine.selected_options as string[])
      }
    }).catch(() => {})
    return () => { live = false }
  }, [vote.id])

  const canVote = !voted && !submitting
  const list = vote.choices.length ? vote.choices : vote.options.map((label, i) => ({ id: String(i), label }))

  const toggle = (id: string) => {
    if (!canVote) return
    setSelected(prev => vote.multi ? (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) : [id])
  }

  const submit = async () => {
    if (!selected.length || submitting || voted) return
    setSubmitting(true); setError(null)
    const anon = getAnonToken()
    const res = await submitVoteResponse({ vote_id: vote.id, selected_options: selected, anon_token: null }, anon)
    if (res.error) {
      // The unique(vote_id, identity) constraint fires if this identity already
      // voted — that's not a failure, it just means the decision is already made.
      if (/duplicate|unique|one_response|already/i.test(res.error)) {
        recordVoted(vote.id, selected); setVoted(true)
      } else { setError(res.error) }
      setSubmitting(false); return
    }
    recordVoted(vote.id, selected)
    setCount(c => c + 1)
    setVoted(true); setSubmitting(false)
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(5,8,20,0.74)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
    >
      <div style={{ background: 'var(--color-void)', border: `1px solid ${LORANGE}`, borderRadius: 6, padding: 16, width: '100%', maxWidth: 380 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: FS_LABEL, fontWeight: 700, lineHeight: 1.4, color: LORANGE, marginBottom: voted ? 8 : 14 }}>{vote.title}</div>
        {voted && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, color: GREEN, marginBottom: 12, letterSpacing: '0.06em' }}>✓ YOU VOTED · your choice is final</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {list.map((c) => {
            const on = selected.includes(c.id)
            return (
              <div key={c.id} onClick={() => toggle(c.id)} aria-disabled={!canVote} style={{
                border: `1px solid ${on ? ORANGE : 'rgba(245,245,245,0.12)'}`,
                background: on ? 'rgba(255,107,53,0.12)' : 'transparent',
                borderRadius: 3, padding: '9px 10px',
                color: on ? LORANGE : 'rgba(245,245,245,0.6)',
                fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, lineHeight: 1.4,
                display: 'flex', justifyContent: 'space-between', gap: 8,
                cursor: canVote ? 'pointer' : 'default', opacity: voted && !on ? 0.5 : 1,
              }}>
                <span>{c.label}</span><span>{on ? '◉' : '○'}</span>
              </div>
            )
          })}
        </div>
        {error && <div style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, color: '#FF6B6B', marginTop: 10 }}>{error}</div>}
        {voted ? (
          <div style={{ marginTop: 14, border: `1px solid ${GREEN}`, color: GREEN, textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: FS_CAPTION, letterSpacing: '0.15em', padding: 11, borderRadius: 3 }}>✓ DECISION MADE</div>
        ) : (
          <div
            onClick={submit}
            aria-disabled={!selected.length || submitting}
            style={{ marginTop: 14, background: ORANGE, color: '#0A0E27', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: FS_CAPTION, letterSpacing: '0.15em', padding: 11, borderRadius: 3, cursor: selected.length && !submitting ? 'pointer' : 'not-allowed', opacity: selected.length && !submitting ? 1 : 0.55 }}
          >{submitting ? 'SUBMITTING…' : 'MAKE A DECISION'}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.35)', marginTop: 10 }}>
          <Radio size={12} strokeWidth={1.75} aria-hidden style={{ flexShrink: 0 }} />
          {count} · {vote.ends}
        </div>
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
              ? <SmartImage src={avatar} alt={name} sizes="72px" width={72} height={72} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

// ─── Voyager gate modal — shown when a non-Voyager taps gated intel / a vote ──

function VoyagerGateModal({ kind, title, packHref, onClose }: { kind: 'intel' | 'vote'; title: string; packHref: string; onClose: () => void }) {
  const body = kind === 'vote'
    ? 'Only Voyagers can take part in this vote.'
    : 'This intelligence is restricted to Voyagers.'
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(5,8,20,0.78)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
    >
      <div style={{ background: 'var(--color-void)', border: `1px solid ${ORANGE}`, borderRadius: 6, padding: 20, width: '100%', maxWidth: 360, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: FS_CAPTION, fontWeight: 700, letterSpacing: '0.22em', color: ORANGE }}>VOYAGER ONLY</span>
        </div>
        <div style={{ fontSize: FS_LABEL, fontWeight: 700, lineHeight: 1.4, color: 'var(--color-star)', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: FS_CAPTION, lineHeight: 1.55, color: 'rgba(245,245,245,0.6)', marginBottom: 18 }}>{body}</div>
        <Link href={packHref} style={{ display: 'block', background: ORANGE, color: '#0A0E27', textDecoration: 'none', fontWeight: 700, fontSize: FS_LABEL, letterSpacing: '0.08em', padding: '12px 0', borderRadius: 3 }}>
          BECOME A VOYAGER
        </Link>
      </div>
    </div>
  )
}

// ─── Sign-in gate modal — shown when a guest taps a vote (voting requires login)
function SignInGateModal({ title, signInHref, onClose }: { title: string; signInHref: string; onClose: () => void }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(5,8,20,0.78)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
    >
      <div style={{ background: 'var(--color-void)', border: `1px solid ${ORANGE}`, borderRadius: 6, padding: 20, width: '100%', maxWidth: 360, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: FS_CAPTION, fontWeight: 700, letterSpacing: '0.22em', color: ORANGE }}>SIGN IN TO VOTE</span>
        </div>
        <div style={{ fontSize: FS_LABEL, fontWeight: 700, lineHeight: 1.4, color: 'var(--color-star)', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: FS_CAPTION, lineHeight: 1.55, color: 'rgba(245,245,245,0.6)', marginBottom: 18 }}>Sign in to cast your vote — every decision is tied to your identity.</div>
        <Link href={signInHref} style={{ display: 'block', background: ORANGE, color: '#0A0E27', textDecoration: 'none', fontWeight: 700, fontSize: FS_LABEL, letterSpacing: '0.08em', padding: '12px 0', borderRadius: 3 }}>
          SIGN IN
        </Link>
      </div>
    </div>
  )
}

// ─── Page client ──────────────────────────────────────────────────────────────

export function FeedProtoClient({ entries, embedded = false, hideHeader = false, leadSlot, packHref = '/voyager-pack', canVote = true, signInHref = '/login' }: { entries: FeedEntry[]; embedded?: boolean; hideHeader?: boolean; leadSlot?: ReactNode; packHref?: string; canVote?: boolean; signInHref?: string }) {
  // Track the specific vote that was clicked — every vote must open its own
  // options, not the first vote's.
  const [activeVote, setActiveVote] = useState<VoteCard | null>(null)
  // The new-voyager whose intro popup is open (null = none).
  const [activeVoyager, setActiveVoyager] = useState<Person | null>(null)
  // The gated item (intel / vote) whose Voyager-gate modal is open (null = none).
  const [gate, setGate] = useState<{ kind: 'intel' | 'vote'; title: string } | null>(null)
  // True while the "sign in to vote" prompt is open (guests can't cast a ballot).
  const [signInTitle, setSignInTitle] = useState<string | null>(null)

  const outer = embedded
    ? { color: 'var(--color-star)' as const }
    : { height: '100dvh', overflowY: 'auto' as const, background: 'var(--color-deep)', color: 'var(--color-star)' }

  // Row-major two-column split: even-index entries fill the left column, odd the
  // right. The on-page reading order (left→right, top→down) then matches the
  // newest-first `entries` order. Plain CSS `column-count` is column-major — it
  // fills the entire left column before the right, floating an older card (top
  // of the right column) above a newer one (bottom of the left).
  const leftCol: FeedEntry[] = []
  const rightCol: FeedEntry[] = []
  entries.forEach((e, i) => (i % 2 === 0 ? leftCol : rightCol).push(e))
  const renderEntry = (e: FeedEntry) =>
    e.kind === 'vote'
      ? <VoteTofu key={`vote-${e.vote.id}`} vote={e.vote} canVote={canVote} onVote={() => setActiveVote(e.vote)} onLocked={() => setGate({ kind: 'vote', title: e.vote.title })} onSignIn={() => setSignInTitle(e.vote.title)} />
      : <ContentCard key={e.item.id} item={e.item} onMember={it => setActiveVoyager(it.actor ?? null)} onLocked={it => setGate({ kind: 'intel', title: it.title })} />

  return (
    <div style={outer}>
      {/* Skeleton shimmer for image placeholders — inlined so it ships without
          depending on globals.css (which the dev server's CSS HMR misses). */}
      <style>{`
        .feed-skel { background-image: linear-gradient(100deg, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.02) 70%); background-size: 200% 100%; animation: feed-skel-shimmer 1.4s ease-in-out infinite; }
        @keyframes feed-skel-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        {embedded ? (hideHeader ? null : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0 6px 14px' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, fontWeight: 700, letterSpacing: '0.3em', color: ORANGE }}>INTERNAL UPDATES</span>
            <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
          </div>
        )) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px',
            borderBottom: '1px solid #161c30', position: 'sticky', top: 0, zIndex: 10,
            background: 'rgba(10,14,39,0.92)', backdropFilter: 'blur(12px)',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, fontWeight: 700, letterSpacing: '0.24em', color: ORANGE }}>INTERNAL UPDATES</span>
            <span style={{ color: 'rgba(245,245,245,0.35)', fontSize: FS_LABEL }}>⌖</span>
          </div>
        )}

        <div style={{ padding: embedded ? 0 : 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {leadSlot && (
              <div style={{ marginBottom: 11 }}>{leadSlot}</div>
            )}
            {leftCol.map(renderEntry)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {rightCol.map(renderEntry)}
          </div>
        </div>

        {!embedded && (
          <div style={{ textAlign: 'center', color: 'rgba(245,245,245,0.25)', fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, padding: '12px 0 96px', letterSpacing: '0.2em' }}>
            ↓ END OF SIGNAL WINDOW
          </div>
        )}
      </div>

      {/* Portaled to <body> so the fixed-position overlays escape the AccessGate's
          `filter` containing block (otherwise they're trapped in the frosted feed
          region and the card centers off-screen — a black-screen-only modal). */}
      {activeVote && <Portal><VoteModal vote={activeVote} onClose={() => setActiveVote(null)} /></Portal>}
      {activeVoyager && <Portal><VoyagerIntroModal person={activeVoyager} onClose={() => setActiveVoyager(null)} /></Portal>}
      {gate && <Portal><VoyagerGateModal kind={gate.kind} title={gate.title} packHref={packHref} onClose={() => setGate(null)} /></Portal>}
      {signInTitle !== null && <Portal><SignInGateModal title={signInTitle} signInHref={signInHref} onClose={() => setSignInTitle(null)} /></Portal>}
    </div>
  )
}
