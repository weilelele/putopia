'use client'

/**
 * DESIGN DEMO — Signal Dispatch card, before/after the design-review changes.
 * Self-contained mock data, no Supabase / server actions. Route: /signal-demo
 * Safe to delete once the redesign is reviewed.
 */

import { useState } from 'react'

// ---- mock data -------------------------------------------------------------
const GRADIENTS = [
  'radial-gradient(120% 120% at 30% 20%, #2a3a6e 0%, #0b1230 70%)',
  'radial-gradient(120% 120% at 70% 30%, #6e3a2a 0%, #1a0d08 70%)',
  'radial-gradient(120% 120% at 40% 70%, #2a6e55 0%, #08160f 70%)',
  'radial-gradient(120% 120% at 60% 60%, #5a2a6e 0%, #140820 70%)',
]
const REF_GRADIENT = 'radial-gradient(120% 120% at 50% 40%, #b8541f 0%, #2a0f04 75%)'
const OPTIONS = [
  { id: 'a', g: GRADIENTS[0], pct: 12 },
  { id: 'b', g: GRADIENTS[1], pct: 8 },
  { id: 'c', g: GRADIENTS[2], pct: 61 }, // correct / mine
  { id: 'd', g: GRADIENTS[3], pct: 19 },
]
const MINE = 'c'
const PROMPT = 'Which signal comes from the same world as the reference?'

function AssetBox({ g }: { g: string }) {
  return <div style={{ width: '100%', aspectRatio: '1', background: g, display: 'block' }} />
}

// ===========================================================================
// BEFORE — current production styles (copied verbatim from SignalFeed.tsx)
// ===========================================================================
function BeforeCard({ answered }: { answered: boolean }) {
  const [pick, setPick] = useState<string | null>(answered ? MINE : null)
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '0.15em', color: '#F5F5F5', textTransform: 'uppercase' }}>
          THE GLASS MERIDIAN <span style={{ color: '#E85D04', fontSize: 12 }}>→</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{ background: 'none', border: '1px solid rgba(255,107,53,0.3)', color: 'rgba(245,245,245,0.7)', width: 28, height: 28, fontFamily: 'monospace', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◀</button>
          <span style={{ fontSize: 12, color: 'rgba(245,245,245,0.55)', letterSpacing: '0.1em', minWidth: 48, textAlign: 'center' }}>DAY 4</span>
          <button style={{ background: 'none', border: '1px solid rgba(255,107,53,0.3)', color: 'rgba(245,245,245,0.15)', width: 28, height: 28, fontFamily: 'monospace', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▶</button>
        </div>
      </div>

      <div style={{ background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, gap: 12 }}>
          <p style={{ fontSize: 13.5, margin: 0, lineHeight: 1.55, color: 'rgba(245,245,245,0.85)' }}>{PROMPT}</p>
          <span style={{ fontSize: 12, color: 'rgba(245,245,245,0.35)', whiteSpace: 'nowrap' }}>284 responses</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: 'rgba(245,245,245,0.35)', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>REFERENCE</span>
          <div style={{ width: 64, flexShrink: 0, border: '1px solid rgba(255,107,53,0.25)' }}><AssetBox g={REF_GRADIENT} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {OPTIONS.map((a, i) => {
            const isMine = answered && a.id === MINE
            const isPicked = !answered && pick === a.id
            return (
              <div key={a.id} onClick={() => !answered && setPick(a.id)}
                style={{ border: isMine ? '2px solid #20D890' : isPicked ? '2px solid #FF6B35' : '1px solid rgba(255,107,53,0.16)', background: '#070912', cursor: answered ? 'default' : 'pointer', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 4, left: 4, zIndex: 2, background: 'rgba(7,9,18,0.8)', color: 'rgba(245,245,245,0.65)', fontSize: 12, padding: '1px 4px', letterSpacing: '0.08em' }}>{String.fromCharCode(65 + i)}</div>
                {isMine && <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 2, color: '#20D890', fontSize: 12, lineHeight: 1 }}>✓</div>}
                <AssetBox g={a.g} />
                {answered && (
                  <div style={{ padding: '4px 5px' }}>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${a.pct}%`, height: '100%', background: isMine ? '#20D890' : '#E85D04' }} />
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(245,245,245,0.45)', marginTop: 2 }}>{a.pct}%</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 14 }}>
          {answered ? (
            <div style={{ fontSize: 12, color: '#20D890', letterSpacing: '0.05em' }}>● Response recorded.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button style={{ padding: '7px 18px', fontFamily: 'inherit', fontSize: 12, letterSpacing: '0.12em', border: 'none', cursor: pick ? 'pointer' : 'default', background: pick ? '#FF6B35' : 'rgba(255,107,53,0.25)', color: '#070912' }}>SUBMIT</button>
              <span style={{ fontSize: 12, color: 'rgba(245,245,245,0.35)' }}>Submit to see how others responded</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ===========================================================================
// AFTER — tokenized, bd-faint resting borders, orange = interactive only,
// HUD primitives (.card-void / .btn-primary / .progress-track / .status-pill /
// .label-tag), constant border width (no reflow), no sub-12px text.
// ===========================================================================
function AfterCard({ answered }: { answered: boolean }) {
  const [pick, setPick] = useState<string | null>(answered ? MINE : null)
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--color-star)', textTransform: 'uppercase' }}>
          THE GLASS MERIDIAN <span style={{ color: 'var(--color-burnt)', fontSize: 12 }}>→</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{ background: 'none', border: '1px solid var(--bd-cyan)', color: 'var(--color-star-dim)', width: 28, height: 28, fontFamily: 'var(--font-mono)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◀</button>
          <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)', letterSpacing: '0.1em', minWidth: 48, textAlign: 'center' }}>DAY 4</span>
          <button style={{ background: 'none', border: '1px solid var(--bd-faint)', color: 'var(--color-star-deep)', width: 28, height: 28, fontFamily: 'var(--font-mono)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▶</button>
        </div>
      </div>

      {/* .card-void = var(--color-void) bg + --bd-faint hairline */}
      <div className="card-void" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, gap: 12 }}>
          <p style={{ fontSize: 13.5, margin: 0, lineHeight: 1.55, color: 'var(--color-star)' }}>{PROMPT}</p>
          <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', whiteSpace: 'nowrap' }}>284 responses</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span className="label-tag" style={{ color: 'var(--color-star-dim)', borderColor: 'var(--bd-faint)' }}>REFERENCE</span>
          <div style={{ width: 64, flexShrink: 0, border: '1px solid var(--bd-cyan-2)' }}><AssetBox g={REF_GRADIENT} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {OPTIONS.map((a, i) => {
            const isMine = answered && a.id === MINE
            const isPicked = !answered && pick === a.id
            // constant 1px border (no reflow); state shown via color + inset glow
            const border = isMine ? 'var(--color-ok)' : isPicked ? 'var(--color-nucleus)' : 'var(--bd-faint)'
            const ring = isMine
              ? 'inset 0 0 0 1px var(--color-ok), 0 0 12px rgba(32,216,144,0.25)'
              : isPicked
                ? 'inset 0 0 0 1px var(--color-nucleus), 0 0 12px rgba(255,107,53,0.25)'
                : 'none'
            return (
              <div key={a.id} onClick={() => !answered && setPick(a.id)}
                style={{ border: `1px solid ${border}`, boxShadow: ring, background: 'var(--color-deep)', cursor: answered ? 'default' : 'pointer', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 4, left: 4, zIndex: 2, background: 'rgba(10,14,39,0.8)', color: 'var(--color-star-dim)', fontSize: 'var(--fs-caption)', padding: '1px 5px', letterSpacing: '0.08em' }}>{String.fromCharCode(65 + i)}</div>
                {isMine && <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 2, color: 'var(--color-ok)', fontSize: 'var(--fs-caption)', lineHeight: 1 }}>✓</div>}
                <AssetBox g={a.g} />
                {answered && (
                  <div style={{ padding: '5px 5px 6px' }}>
                    <div className="progress-track" style={{ height: 3 }}>
                      <div className="progress-fill cyan" style={{ width: `${a.pct}%`, boxShadow: 'none', background: isMine ? 'var(--color-ok)' : undefined }} />
                    </div>
                    <div style={{ fontSize: 'var(--fs-caption)', color: isMine ? 'var(--color-ok)' : 'var(--color-star-deep)', marginTop: 3 }}>{a.pct}%</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 16 }}>
          {answered ? (
            <span className="status-pill status-ok"><span className="dot" />Response recorded</span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn-primary" disabled={!pick} style={{ padding: '0.6rem 1.6rem' }}>SUBMIT</button>
              <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)' }}>Submit to see how others responded</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ===========================================================================
export default function SignalDemoPage() {
  const [mode, setMode] = useState<'before' | 'after'>('after')
  const Card = mode === 'before' ? BeforeCard : AfterCard

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-deep)', padding: '32px 28px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-star)' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* header */}
        <div style={{ borderBottom: '1px solid var(--bd-cyan-2)', paddingBottom: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '0.04em' }}>SIGNAL DISPATCH</h1>
            {/* "?" button — square (was a circle) to match the angular HUD language */}
            <button style={{ width: 22, height: 22, border: '1px solid var(--bd-cyan)', background: 'transparent', color: 'var(--color-star-dim)', fontSize: 12, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?</button>
          </div>
        </div>

        {/* mode toggle (demo chrome only) */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {(['before', 'after'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              style={{
                padding: '7px 16px', fontFamily: 'inherit', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
                border: '1px solid ' + (mode === m ? 'var(--color-nucleus)' : 'var(--bd-faint)'),
                background: mode === m ? 'rgba(255,107,53,0.12)' : 'transparent',
                color: mode === m ? 'var(--color-nucleus)' : 'var(--color-star-dim)',
              }}>{m}</button>
          ))}
        </div>

        <Card answered={false} />
        <Card answered={true} />
      </div>
    </main>
  )
}
