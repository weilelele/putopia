'use client'

import { useState } from 'react'

// ─── Shared types (also consumed by the server page) ──────────────────────────

export type Person = { name: string; initial: string; avatar?: string | null }

export type FeedItem = {
  id: string
  kind: 'info' | 'world' | 'device' | 'member'
  color: string
  eyebrow: string
  title: string
  snippet?: string
  image?: string | null
  gradient?: [string, string] | null
  actor?: Person | null
  memberSub?: string
  time: string
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

const ORANGE = '#FF6B35'
const LORANGE = '#FF8A5C'
const GREEN = '#20D890'
const BURNT = '#E85D04'

// ─── Atoms ────────────────────────────────────────────────────────────────────

function Avatar({ p, size = 18 }: { p: Person; size?: number }) {
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
      background: BURNT, color: '#0A0E27', fontWeight: 700, fontSize: size * 0.46,
      fontFamily: 'var(--font-mono)',
    }}>{p.initial}</span>
  )
}

function Cover({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={{ width: '100%', display: 'block', objectFit: 'cover', filter: 'brightness(0.85) saturate(0.85)' }} />
  )
}

function Footer({ actor, time, align = 'space-between' }: { actor?: Person | null; time: string; align?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: align, marginTop: 10 }}>
      {actor ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Avatar p={actor} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(245,245,245,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {actor.name}
          </span>
        </span>
      ) : <span />}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(245,245,245,0.35)', flexShrink: 0, marginLeft: 6 }}>{time}</span>
    </div>
  )
}

// ─── Content card ─────────────────────────────────────────────────────────────

function ContentCard({ item, onOpen }: { item: FeedItem; onOpen: (i: FeedItem) => void }) {
  const isMember = item.kind === 'member'
  const hasImage = !!item.image
  return (
    <div
      onClick={() => onOpen(item)}
      style={{
        breakInside: 'avoid', marginBottom: 8, background: 'var(--color-void)',
        border: '1px solid rgba(245,245,245,0.08)', borderRadius: 3, overflow: 'hidden', cursor: 'pointer',
      }}
    >
      {hasImage && !isMember && <Cover src={item.image as string} />}
      {!hasImage && !isMember && item.gradient && (
        <div style={{ height: 84, background: `linear-gradient(150deg, ${item.gradient[0]}, ${item.gradient[1]})` }} />
      )}

      {isMember && (
        <div style={{ paddingTop: 14, textAlign: 'center' }}>
          {item.actor && <Avatar p={item.actor} size={54} />}
        </div>
      )}

      <div style={{ padding: '10px 11px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, lineHeight: 1.38, color: item.color, textAlign: isMember ? 'center' : 'left' }}>
          {item.title}
        </div>

        {/* No-image info: show a content preview to carry more information */}
        {!hasImage && !isMember && item.snippet && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.55, color: 'rgba(245,245,245,0.5)',
            marginTop: 7, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{item.snippet}</div>
        )}

        {isMember && item.memberSub && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,176,32,0.85)', textAlign: 'center', marginTop: 5, letterSpacing: '0.04em' }}>
            {item.memberSub}
          </div>
        )}

        {isMember
          ? <Footer time={item.time} align="flex-end" />
          : <Footer actor={item.actor} time={item.time} />}
      </div>
    </div>
  )
}

// ─── Vote card (stronger CTA + recent voters embedded) ────────────────────────

function VoteTofu({ vote, onVote }: { vote: VoteCard; onVote: () => void }) {
  const shown = vote.voters.slice(0, 5)
  const extra = Math.max(0, vote.count - shown.length)
  return (
    <div
      onClick={onVote}
      style={{
        breakInside: 'avoid', marginBottom: 8, background: '#1A1107',
        border: `1px solid ${LORANGE}`, borderRadius: 3, overflow: 'hidden', cursor: 'pointer', padding: '11px 12px',
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, lineHeight: 1.38, color: LORANGE }}>
        {vote.title}
      </div>

      {/* Recent voters embedded — makes the act of voting feel alive */}
      {shown.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <span style={{ display: 'flex' }}>
            {shown.map((v, i) => (
              <span key={i} style={{ marginLeft: i === 0 ? 0 : -7, position: 'relative', zIndex: shown.length - i, border: '1.5px solid #1A1107', borderRadius: '50%', display: 'inline-flex' }}>
                <Avatar p={v} size={20} />
              </span>
            ))}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(245,245,245,0.5)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {shown.map(v => v.name).join(', ')}{extra > 0 ? ` +${extra}` : ''}
          </span>
        </div>
      )}

      {/* Full solid button */}
      <div style={{
        marginTop: 11, background: ORANGE, color: '#0A0E27', textAlign: 'center',
        fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, letterSpacing: '0.15em',
        padding: '11px 0', borderRadius: 2,
      }}>CAST YOUR SIGNAL ▸</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(245,245,245,0.45)' }}>{vote.count} signals in</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(245,245,245,0.35)' }}>{vote.ends}</span>
      </div>
    </div>
  )
}

// ─── Detail push screen ───────────────────────────────────────────────────────

function Detail({ item, onBack }: { item: FeedItem; onBack: () => void }) {
  const isMember = item.kind === 'member'
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--color-deep)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderBottom: '1px solid #161c30', flexShrink: 0 }}>
        <span onClick={onBack} style={{ color: ORANGE, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>‹</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', color: item.color }}>{item.eyebrow}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {item.image && !isMember && <Cover src={item.image} />}
        {isMember && item.actor && (
          <div style={{ padding: '28px 0', textAlign: 'center' }}><Avatar p={item.actor} size={84} /></div>
        )}
        <div style={{ padding: 16, maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, lineHeight: 1.35, color: item.color, marginBottom: 14 }}>{item.title}</div>
          {item.snippet && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7, color: 'rgba(245,245,245,0.7)', marginBottom: 18 }}>{item.snippet}</div>
          )}
          {item.memberSub && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'rgba(255,176,32,0.9)', marginBottom: 18 }}>{item.memberSub}</div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #161c30', paddingTop: 12 }}>
            {item.actor ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar p={item.actor} size={24} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(245,245,245,0.6)' }}>{item.actor.name}</span>
              </span>
            ) : <span />}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(245,245,245,0.35)' }}>{item.time}</span>
          </div>
        </div>
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
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, lineHeight: 1.4, color: LORANGE, marginBottom: 14 }}>{vote.title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {vote.options.map((o, i) => {
            const on = i === picked
            return (
              <div key={i} onClick={() => setPicked(i)} style={{
                border: `1px solid ${on ? ORANGE : 'rgba(245,245,245,0.12)'}`, background: on ? 'rgba(255,107,53,0.12)' : 'transparent',
                borderRadius: 3, padding: '9px 10px', color: on ? LORANGE : 'rgba(245,245,245,0.6)', fontFamily: 'var(--font-mono)',
                fontSize: 11, lineHeight: 1.4, display: 'flex', justifyContent: 'space-between', gap: 8, cursor: 'pointer',
              }}>
                <span>{o}</span><span>{on ? '◉' : '○'}</span>
              </div>
            )
          })}
        </div>
        <div
          onClick={() => { setCast(true); setTimeout(onClose, 800) }}
          style={{ marginTop: 14, background: cast ? GREEN : ORANGE, color: '#0A0E27', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', padding: 11, borderRadius: 3, cursor: 'pointer' }}
        >{cast ? '✓ SIGNAL CAST' : 'CAST SIGNAL ▸'}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textAlign: 'center', color: 'rgba(245,245,245,0.35)', marginTop: 10 }}>{vote.count} signals in · {vote.ends}</div>
      </div>
    </div>
  )
}

// ─── Page client ──────────────────────────────────────────────────────────────

export function FeedProtoClient({ items, vote }: { items: FeedItem[]; vote: VoteCard | null }) {
  const [detail, setDetail] = useState<FeedItem | null>(null)
  const [voteOpen, setVoteOpen] = useState(false)

  // Insert the vote card after the first two items so it surfaces high.
  const head = items.slice(0, 2)
  const tail = items.slice(2)

  return (
    <div style={{ height: '100dvh', overflowY: 'auto', background: 'var(--color-deep)', color: 'var(--color-star)' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px',
          borderBottom: '1px solid #161c30', position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(10,14,39,0.92)', backdropFilter: 'blur(12px)',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.24em', color: ORANGE }}>SIGNAL FEED</span>
          <span style={{ color: 'rgba(245,245,245,0.35)', fontSize: 14 }}>⌖</span>
        </div>

        <div style={{ padding: 10, columnCount: 2, columnGap: 8 }}>
          {head.map(it => <ContentCard key={it.id} item={it} onOpen={setDetail} />)}
          {vote && <VoteTofu vote={vote} onVote={() => setVoteOpen(true)} />}
          {tail.map(it => <ContentCard key={it.id} item={it} onOpen={setDetail} />)}
        </div>

        <div style={{ textAlign: 'center', color: 'rgba(245,245,245,0.25)', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '12px 0 96px', letterSpacing: '0.2em' }}>
          ↓ END OF SIGNAL WINDOW
        </div>
      </div>

      {detail && <Detail item={detail} onBack={() => setDetail(null)} />}
      {voteOpen && vote && <VoteModal vote={vote} onClose={() => setVoteOpen(false)} />}
    </div>
  )
}
