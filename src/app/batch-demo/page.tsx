'use client'

import { useRef, useState } from 'react'

// ── Mock data ────────────────────────────────────────────────────────────────
const ACCENT_COLORS = [
  '#E8A020', '#D4601A', '#FF8A5C', '#FFB020',
  '#C43020', '#C4A96A', '#B5430A', '#FF6B35', '#E85D04',
]
function accentColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length]
}
function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const FIRST = ['Aria', 'Kano', 'Vera', 'Idris', 'Mei', 'Soren', 'Lena', 'Cyrus', 'Nova', 'Tariq', 'Yuki', 'Esme', 'Rhea', 'Dax', 'Ivo', 'Oona', 'Pell', 'Suki', 'Vlad', 'Wren', 'Zara', 'Bram', 'Cleo', 'Enzo']
const LAST = ['Okonkwo', 'Vance', 'Sol', 'Marlowe', 'Tanaka', 'Reyes', 'Abara', 'Lindqvist', 'Oyelaran', 'Petrov', 'Sandoval', 'Cho', 'Bauer', 'Nakamura']
const PLACES = ['Lagos NG', 'Berlin DE', 'Kyoto JP', 'Austin US', 'São Paulo BR', 'Oslo NO', 'Cairo EG', 'Toronto CA', 'Seoul KR', 'Lisbon PT']

type Member = { id: string; name: string; location: string }

function makeMembers(seed: number, count: number): Member[] {
  const out: Member[] = []
  for (let i = 0; i < count; i++) {
    const f = FIRST[(seed * 7 + i * 3) % FIRST.length]
    const l = LAST[(seed * 5 + i * 2) % LAST.length]
    out.push({
      id: `${seed}-${i}`,
      name: `${f} ${l}`,
      location: PLACES[(seed + i) % PLACES.length],
    })
  }
  return out
}

type Batch = { id: string; label: string; members: Member[] }
// Varying sizes — some small, some large — to exercise the "expand" behavior.
const SIZES = [4, 28, 12, 7, 41, 9, 18, 5, 33, 6, 15, 22]
const BATCHES: Batch[] = SIZES.map((n, i) => ({
  id: `b${i + 1}`,
  label: `BATCH ${String(i + 1).padStart(2, '0')}`,
  members: makeMembers(i + 1, n),
}))

const ARCHITECTS = makeMembers(99, 3).map((m, i) => ({ ...m, name: ['Dr. Iris Vale', 'Marcus Quill', 'Saoirse Behn'][i] }))

const COLLAPSED_COUNT = 8

// ── Page ─────────────────────────────────────────────────────────────────────
export default function BatchDemoPage() {
  const [active, setActive] = useState(BATCHES[0].id)
  const [expanded, setExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const activeBatch = BATCHES.find(b => b.id === active)!
  const shown = expanded ? activeBatch.members : activeBatch.members.slice(0, COLLAPSED_COUNT)
  const hasMore = activeBatch.members.length > COLLAPSED_COUNT

  const selectBatch = (id: string) => { setActive(id); setExpanded(false) }

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 240, behavior: 'smooth' })
  }

  return (
    <div className="main">
      <style>{`
        .batch-rail::-webkit-scrollbar { display: none; }
        .batch-rail { scrollbar-width: none; }
      `}</style>

      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> VOYAGERS <span>/</span> BATCH-DEMO</div>
        <div className="right">
          <div className="item">BATCHES <span className="val">{BATCHES.length}</span></div>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="h-eyebrow">{"// NETWORK"}</div>
          <h1>VOYAGER <span className="accent">BATCHES</span></h1>
          <p className="sub">Horizontal-scroll demo — mock data</p>
        </div>
      </div>

      {/* Architect council — pinned, batch-agnostic */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', fontFamily: 'var(--font-mono)', letterSpacing: '0.25em', marginBottom: '1rem', paddingBottom: '8px', borderBottom: '1px solid rgba(255,107,53,0.16)' }}>{"// ARCHITECT COUNCIL"}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {ARCHITECTS.map(m => <MemberCard key={m.id} m={m} architect />)}
        </div>
      </section>

      {/* Batch selector — horizontal scroll rail */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', fontFamily: 'var(--font-mono)', letterSpacing: '0.25em', marginBottom: '0.75rem' }}>{"// BATCHES"}</div>

        <div style={{ position: 'relative' }}>
          {/* arrows (desktop) */}
          <button onClick={() => scrollBy(-1)} aria-label="scroll left" style={arrowStyle('left')}>‹</button>
          <button onClick={() => scrollBy(1)} aria-label="scroll right" style={arrowStyle('right')}>›</button>

          {/* edge fades */}
          <div style={fadeStyle('left')} />
          <div style={fadeStyle('right')} />

          <div
            ref={scrollRef}
            className="batch-rail"
            style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', padding: '2px 0', scrollBehavior: 'smooth' }}
          >
            {BATCHES.map(b => {
              const isActive = b.id === active
              return (
                <button
                  key={b.id}
                  onClick={() => selectBatch(b.id)}
                  style={{
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.55rem 0.9rem',
                    fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em',
                    background: isActive ? 'rgba(232,93,4,0.12)' : '#151B3A',
                    color: isActive ? '#E85D04' : 'rgba(245,245,245,0.55)',
                    border: `1px solid ${isActive ? '#E85D04' : 'rgba(255,107,53,0.16)'}`,
                    boxShadow: isActive ? '0 0 12px rgba(232,93,4,0.18)' : 'none',
                    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                  }}
                >
                  {b.label}
                  <span style={{
                    fontSize: '0.65rem', padding: '1px 6px', borderRadius: '999px',
                    background: isActive ? 'rgba(232,93,4,0.2)' : 'rgba(245,245,245,0.08)',
                    color: isActive ? '#FF8A5C' : 'rgba(245,245,245,0.45)',
                  }}>
                    {b.members.length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Selected batch members */}
      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ color: '#E85D04', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', letterSpacing: '0.18em' }}>{activeBatch.label}</span>
          <span style={{ color: 'rgba(245,245,245,0.35)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)' }}>
            {activeBatch.members.length} members
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {shown.map(m => <MemberCard key={m.id} m={m} />)}
        </div>

        {hasMore && (
          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button onClick={() => setExpanded(e => !e)} className="btn-ghost" style={{ fontSize: 'var(--fs-caption)' }}>
              {expanded ? '▲ COLLAPSE' : `▼ SHOW ALL (${activeBatch.members.length})`}
            </button>
          </div>
        )}
      </section>

      <div className="footer-bar" style={{ marginTop: '2rem' }}>
        <div className="tag">— BATCH SELECTOR DEMO</div>
        <div>VOYAGER REGISTRY</div>
      </div>
    </div>
  )
}

// ── helpers ──────────────────────────────────────────────────────────────────
function arrowStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    [side]: '-4px', zIndex: 3,
    width: 28, height: 28, borderRadius: '50%',
    background: 'rgba(15,20,48,0.92)', border: '1px solid rgba(255,107,53,0.3)',
    color: '#E85D04', fontFamily: 'var(--font-mono)', fontSize: '1rem', lineHeight: 1,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
function fadeStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', top: 0, bottom: 0, [side]: 0, width: 40, zIndex: 2,
    pointerEvents: 'none',
    background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, var(--bg-base, #0A0E27), transparent)`,
  }
}

function MemberCard({ m, architect = false }: { m: Member; architect?: boolean }) {
  const color = accentColor(m.name)
  return (
    <div className="border p-3" style={{ background: '#151B3A', borderColor: architect ? 'rgba(232,160,32,0.3)' : 'rgba(255,107,53,0.16)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', background: `${color}18`, color, border: `2px solid ${color}40` }}>
        {getInitials(m.name)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: '#F5F5F5', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
          {architect && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', padding: '1px 5px', color: '#E8A020', border: '1px solid rgba(232,160,32,0.35)', background: 'rgba(232,160,32,0.06)' }}>ARCH</span>}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)', marginTop: '2px' }}>{m.location}</div>
      </div>
    </div>
  )
}
