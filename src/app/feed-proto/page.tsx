'use client'

import { useState } from 'react'

// ─── Feed prototype (v2) ──────────────────────────────────────────────────────
// Two-column masonry · image-forward · title-led · author bottom-left · time
// bottom-right. Tapping a content card pushes its detail screen (mirrors the
// real /intel/[id], /worlds/[id]... routes). Tapping a vote card opens an
// in-place voting overlay. Mock data + placeholder imagery only.

type Kind = 'broadcast' | 'vision' | 'tuning' | 'intel' | 'device' | 'member' | 'vote'

type FeedEvent = {
  id: string
  kind: Kind
  color: string
  eyebrow: string
  title: string
  body: string
  image?: string
  actor?: { name: string; initial: string }
  time: string
  voteOptions?: string[]
  voteCount?: number
  voteEnds?: string
}

// Title-colour mapping (official tokens): broadcast/intel = nucleus orange,
// world lifecycle = warn amber, vote = nucleus-2, device = ok green, member = star white.
const ORANGE = '#FF6B35'
const AMBER  = '#FFB020'
const LORANGE = '#FF8A5C'
const GREEN  = '#20D890'
const STAR   = '#F5F5F5'
const BURNT  = '#E85D04'

const EVENTS: FeedEvent[] = [
  {
    id: 'b1', kind: 'broadcast', color: ORANGE, eyebrow: 'ARCHITECT BROADCAST',
    title: 'Phase Two archive expansion is live',
    body: 'With catalogued parallel worlds now exceeding 200 nodes, the archive completes its Phase Two expansion this month. All Voyagers can now upload high-resolution observation data to the new nodes. Legacy format files must be migrated before the end of the cycle.',
    image: 'https://picsum.photos/seed/mc-archive/320/200',
    actor: { name: 'Architects', initial: '◈' }, time: '2h',
  },
  {
    id: 'v1', kind: 'vision', color: AMBER, eyebrow: 'A NEW INITIAL VISION',
    title: 'A New Initial Vision: Ash Reach',
    body: 'A tidally scarred world of black glass plains under a dim red dwarf. Submitted to the collective and awaiting the signal to begin tuning. Cast your interest to move it toward Signal Tuning.',
    image: 'https://picsum.photos/seed/mc-ashreach/320/240',
    actor: { name: 'Mara_V', initial: 'M' }, time: '6h',
  },
  {
    id: 'vote1', kind: 'vote', color: LORANGE, eyebrow: 'SIGNAL VOTE',
    title: 'A New Signal Vote: which band do we probe next?',
    body: 'The collective decides the next probe frequency.',
    voteOptions: ['21cm hydrogen line', 'Deep X-band', 'Wide L-band sweep'],
    voteCount: 47, voteEnds: 'ends 2d', time: '5h',
  },
  {
    id: 'd1', kind: 'device', color: GREEN, eyebrow: 'DEVICE STATUS',
    title: 'Knossos relay back online',
    body: 'Uplink restored at 98% strength. The Cairo monitoring station resumed full telemetry after a maintenance window. All deep-band channels nominal.',
    image: 'https://picsum.photos/seed/mc-knossos/320/200',
    actor: { name: 'Cairo station', initial: 'C' }, time: '1h',
  },
  {
    id: 'm1', kind: 'member', color: STAR, eyebrow: 'NEW VOYAGER',
    title: 'Andromeda_77 is now a Voyager',
    body: 'Welcome aboard. A new signal interpreter joins the collective — specializing in visualizing parallel-world data as generative art.',
    actor: { name: 'Andromeda_77', initial: 'A' }, time: '3h',
  },
  {
    id: 't1', kind: 'tuning', color: AMBER, eyebrow: 'SIGNAL TUNING BEGINS',
    title: 'Signal tuning begins: Veridia',
    body: 'Veridia has entered Signal Tuning. Head to Signal Dispatch to help decipher its incoming signal and shape what this world becomes.',
    image: 'https://picsum.photos/seed/mc-veridia/320/240',
    actor: { name: 'Kit_L', initial: 'K' }, time: '4h',
  },
  {
    id: 'i1', kind: 'intel', color: ORANGE, eyebrow: 'INTELLIGENCE',
    title: 'Recovered fragment suggests a third moon',
    body: 'Spectral analysis of the Kepler-band fragment shows a periodic occlusion consistent with an undocumented satellite. The Architect Council is reviewing whether to authorise a focused exploration.',
    image: 'https://picsum.photos/seed/mc-fragment/320/200',
    actor: { name: 'Dr_Okafor', initial: 'D' }, time: '7h',
  },
  {
    id: 'd2', kind: 'device', color: GREEN, eyebrow: 'NEW DEVICE',
    title: 'New device online: Meridian-2',
    body: 'A new relay node joined the array, now contributing to deep-band coverage over the southern hemisphere. Voyagers may begin requesting observation windows.',
    image: 'https://picsum.photos/seed/mc-meridian/320/200',
    actor: { name: 'the array', initial: '⬡' }, time: 'now',
  },
  {
    id: 'r1', kind: 'broadcast', color: ORANGE, eyebrow: 'VOTE RESULT',
    title: 'Signal locked: 21cm band wins',
    body: 'The collective chose the hydrogen line. Probing of the selected frequency begins on the next cycle.',
    actor: { name: 'Architects', initial: '◈' }, time: '5h',
  },
]

function Avatar({ initial, size = 18, bg = BURNT }: { initial: string; size?: number; bg?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg, color: '#0A0E27', fontWeight: 700, fontSize: size * 0.46,
      fontFamily: 'var(--font-mono)',
    }}>{initial}</span>
  )
}

function Cover({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={{
      width: '100%', display: 'block', objectFit: 'cover',
      filter: 'brightness(0.85) saturate(0.8)',
    }} />
  )
}

function Card({ ev, onOpen, onVote }: { ev: FeedEvent; onOpen: (e: FeedEvent) => void; onVote: () => void }) {
  const click = () => (ev.kind === 'vote' ? onVote() : onOpen(ev))
  return (
    <div
      onClick={click}
      style={{
        breakInside: 'avoid', marginBottom: 8, background: 'var(--color-void)',
        border: '1px solid rgba(245,245,245,0.08)', borderRadius: 3, overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {ev.image && ev.kind !== 'member' && <Cover src={ev.image} />}

      {ev.kind === 'member' && (
        <div style={{ paddingTop: 14, textAlign: 'center' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 54, height: 54, borderRadius: '50%', background: BURNT, color: '#0A0E27',
            fontWeight: 700, fontSize: 22, fontFamily: 'var(--font-mono)',
          }}>{ev.actor?.initial}</span>
        </div>
      )}

      <div style={{ padding: '10px 11px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
          lineHeight: 1.38, color: ev.color,
          textAlign: ev.kind === 'member' ? 'center' : 'left',
        }}>{ev.title}</div>

        {ev.kind === 'vote' && (
          <div style={{
            marginTop: 10, textAlign: 'center', border: '1px dashed rgba(255,138,92,0.55)',
            borderRadius: 2, padding: 6, color: LORANGE, fontFamily: 'var(--font-mono)',
            fontSize: 11, letterSpacing: '0.12em',
          }}>TAP TO CAST ▸</div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: ev.kind === 'member' ? 'flex-end' : 'space-between', marginTop: 10,
        }}>
          {ev.kind === 'vote' ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(245,245,245,0.45)' }}>
              {ev.voteCount} signals in
            </span>
          ) : ev.kind !== 'member' && ev.actor ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <Avatar initial={ev.actor.initial} />
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(245,245,245,0.45)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{ev.actor.name}</span>
            </span>
          ) : <span />}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(245,245,245,0.35)', flexShrink: 0, marginLeft: 6 }}>
            {ev.kind === 'vote' ? ev.voteEnds : ev.time}
          </span>
        </div>
      </div>
    </div>
  )
}

function Detail({ ev, onBack }: { ev: FeedEvent; onBack: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--color-deep)', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px',
        borderBottom: '1px solid #161c30', flexShrink: 0,
      }}>
        <span onClick={onBack} style={{ color: ORANGE, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>‹</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', color: ev.color }}>{ev.eyebrow}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {ev.image && ev.kind !== 'member' && <Cover src={ev.image} />}
        {ev.kind === 'member' && (
          <div style={{ padding: '28px 0', textAlign: 'center' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 84, height: 84, borderRadius: '50%', background: BURNT, color: '#0A0E27',
              fontWeight: 700, fontSize: 34, fontFamily: 'var(--font-mono)',
            }}>{ev.actor?.initial}</span>
          </div>
        )}
        <div style={{ padding: 16, maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, lineHeight: 1.35, color: ev.color, marginBottom: 14 }}>
            {ev.title}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7, color: 'rgba(245,245,245,0.7)', marginBottom: 18 }}>
            {ev.body}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #161c30', paddingTop: 12 }}>
            {ev.actor ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar initial={ev.actor.initial} size={24} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(245,245,245,0.6)' }}>{ev.actor.name}</span>
              </span>
            ) : <span />}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(245,245,245,0.35)' }}>{ev.time}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function VoteModal({ ev, onClose }: { ev: FeedEvent; onClose: () => void }) {
  const [picked, setPicked] = useState(0)
  const [cast, setCast] = useState(false)
  const opts = ev.voteOptions ?? []
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(5,8,20,0.74)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
    >
      <div style={{ background: 'var(--color-void)', border: `1px solid ${LORANGE}`, borderRadius: 6, padding: 16, width: '100%', maxWidth: 360 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, lineHeight: 1.4, color: LORANGE, marginBottom: 14 }}>
          Which band do we probe next?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {opts.map((o, i) => {
            const on = i === picked
            return (
              <div key={o} onClick={() => setPicked(i)} style={{
                border: `1px solid ${on ? ORANGE : 'rgba(245,245,245,0.12)'}`,
                background: on ? 'rgba(255,107,53,0.12)' : 'transparent', borderRadius: 3,
                padding: '9px 10px', color: on ? LORANGE : 'rgba(245,245,245,0.55)',
                fontFamily: 'var(--font-mono)', fontSize: 11, display: 'flex', justifyContent: 'space-between', cursor: 'pointer',
              }}>
                <span>{o}</span><span>{on ? '◉' : '○'}</span>
              </div>
            )
          })}
        </div>
        <div
          onClick={() => { setCast(true); setTimeout(onClose, 800) }}
          style={{
            marginTop: 14, background: cast ? GREEN : ORANGE, color: '#0A0E27', textAlign: 'center',
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, letterSpacing: '0.15em',
            padding: 10, borderRadius: 3, cursor: 'pointer',
          }}
        >{cast ? '✓ SIGNAL CAST' : 'CAST SIGNAL ▸'}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textAlign: 'center', color: 'rgba(245,245,245,0.35)', marginTop: 10 }}>
          投完回到 feed 原位置
        </div>
      </div>
    </div>
  )
}

export default function FeedProtoPage() {
  const [detail, setDetail] = useState<FeedEvent | null>(null)
  const [vote, setVote] = useState<FeedEvent | null>(null)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-deep)', color: 'var(--color-star)' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid #161c30',
          position: 'sticky', top: 0, zIndex: 10, background: 'rgba(10,14,39,0.92)', backdropFilter: 'blur(12px)',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.24em', color: ORANGE }}>
            SIGNAL FEED
          </span>
          <span style={{ color: 'rgba(245,245,245,0.35)', fontSize: 14 }}>⌖</span>
        </div>

        <div style={{ padding: 10, columnCount: 2, columnGap: 8 }}>
          {EVENTS.map(ev => (
            <Card key={ev.id} ev={ev} onOpen={setDetail} onVote={() => setVote(ev)} />
          ))}
        </div>

        <div style={{
          textAlign: 'center', color: 'rgba(245,245,245,0.25)', fontFamily: 'var(--font-mono)',
          fontSize: 10, padding: '12px 0 24px', letterSpacing: '0.2em',
        }}>↓ MORE SIGNALS</div>
      </div>

      {detail && <Detail ev={detail} onBack={() => setDetail(null)} />}
      {vote && <VoteModal ev={vote} onClose={() => setVote(null)} />}
    </div>
  )
}
