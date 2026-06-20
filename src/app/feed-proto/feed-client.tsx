'use client'

import { useState } from 'react'
import Link from 'next/link'
import { WorldPoster } from '@/components/world-poster'

// ─── Shared types (also consumed by the server page) ──────────────────────────

export type Person = { name: string; initial: string; avatar?: string | null; option?: string }

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
      <img src={p.avatar} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />
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
  return (
    <div style={{ width: '100%', aspectRatio: '3 / 2', overflow: 'hidden' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.85) saturate(0.85)' }} />
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

function ContentCard({ item }: { item: FeedItem }) {
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
        />
      </div>
    )
  }

  const isMember = item.kind === 'member'
  const hasImage = !!item.image

  return (
    <Link
      href={item.href}
      style={{
        display: 'block', textDecoration: 'none', breakInside: 'avoid', marginBottom: 11,
        background: 'var(--color-void)', border: '1px solid rgba(245,245,245,0.08)', borderRadius: 3, overflow: 'hidden',
      }}
    >
      {hasImage && !isMember && <Cover src={item.image as string} />}

      {isMember && item.actor && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14 }}>
          <Avatar p={item.actor} size={54} />
        </div>
      )}

      <div style={{ padding: '10px 11px' }}>
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

        {isMember
          ? <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.35)' }}>{item.time}</span></div>
          : <Footer actor={item.actor} time={item.time} />}
      </div>
    </Link>
  )
}

// ─── Vote card — recent voters listed line by line + solid CTA ────────────────

function VoteTofu({ vote, onVote }: { vote: VoteCard; onVote: () => void }) {
  const shown = vote.voters.slice(0, 5)
  const extra = Math.max(0, vote.count - shown.length)
  return (
    <div
      onClick={onVote}
      style={{
        breakInside: 'avoid', marginBottom: 11, background: '#1A1107', border: `1px solid ${LORANGE}`,
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
          {extra > 0 && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, color: 'rgba(245,245,245,0.4)', paddingLeft: 27, whiteSpace: 'nowrap' }}>+{extra} more</div>
          )}
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

// ─── Page client ──────────────────────────────────────────────────────────────

export function FeedProtoClient({ entries, embedded = false }: { entries: FeedEntry[]; embedded?: boolean }) {
  const [voteOpen, setVoteOpen] = useState(false)
  const voteEntry = entries.find(e => e.kind === 'vote')
  const vote = voteEntry && voteEntry.kind === 'vote' ? voteEntry.vote : null

  const outer = embedded
    ? { color: 'var(--color-star)' as const }
    : { height: '100dvh', overflowY: 'auto' as const, background: 'var(--color-deep)', color: 'var(--color-star)' }

  return (
    <div style={outer}>
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
          {entries.map(e => e.kind === 'vote'
            ? <VoteTofu key={`vote-${e.vote.id}`} vote={e.vote} onVote={() => setVoteOpen(true)} />
            : <ContentCard key={e.item.id} item={e.item} />)}
        </div>

        {!embedded && (
          <div style={{ textAlign: 'center', color: 'rgba(245,245,245,0.25)', fontFamily: 'var(--font-mono)', fontSize: FS_CAPTION, padding: '12px 0 96px', letterSpacing: '0.2em' }}>
            ↓ END OF SIGNAL WINDOW
          </div>
        )}
      </div>

      {voteOpen && vote && <VoteModal vote={vote} onClose={() => setVoteOpen(false)} />}
    </div>
  )
}
