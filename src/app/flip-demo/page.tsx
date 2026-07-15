'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Cell = { i: number; ch: string; file: string; x: number; y: number; w: number; h: number }
type Row = { word: string; y0: number; y1: number; rowHeight: number; cells: Cell[]; pool: string[] }
type Manifest = { imgW: number; imgH: number; rows: Record<string, Row> }

const S = 0.25 // px scale applied to original glyph coordinates

// ── speed/feel presets (vary flip speed, spread speed, spacing) ──
type Preset = {
  id: string
  name: string
  desc: string
  tick: number // ms between random glyph swaps while flipping
  base: number // ms before first letter locks
  step: number // ms stagger between letters locking
  lock: number // ms lock animation
  pause: number // ms wait after last lock before spreading
  spread: number // ms spread transition
  kx: number // horizontal compression during flip (1 = official)
  ky: number // vertical compression during flip
}

const PRESETS: Preset[] = [
  { id: 'A', name: 'A · 舒缓', desc: '翻得慢、扩散慢', tick: 64, base: 760, step: 300, lock: 300, pause: 280, spread: 900, kx: 0.8, ky: 0.9 },
  { id: 'B', name: 'B · 标准', desc: '翻牌 +50%、中速扩散', tick: 55, base: 680, step: 225, lock: 280, pause: 240, spread: 680, kx: 0.78, ky: 0.9 },
  { id: 'C', name: 'C · 明快', desc: '翻得快、扩散快', tick: 46, base: 520, step: 170, lock: 240, pause: 160, spread: 460, kx: 0.78, ky: 0.9 },
  { id: 'D', name: 'D · 戏剧扩散', desc: '慢翻 → 停顿 → 快速弹开', tick: 58, base: 720, step: 240, lock: 280, pause: 440, spread: 430, kx: 0.7, ky: 0.86 },
]

type Placed = Cell & {
  row: number
  dispW: number
  dispH: number
  offX: number
  offY: number
  cmpX: number
  cmpY: number
  settleDelay: number
}

function useLayout(m: Manifest | null, p: Preset) {
  return useMemo(() => {
    if (!m) return null
    const all: Cell[] = []
    for (const rk of Object.keys(m.rows)) for (const c of m.rows[rk].cells) all.push(c)
    const minX = Math.min(...all.map((c) => c.x))
    const minY = Math.min(...all.map((c) => c.y))
    const maxX = Math.max(...all.map((c) => c.x + c.w))
    const maxY = Math.max(...all.map((c) => c.y + c.h))
    const stageW = (maxX - minX) * S
    const stageH = (maxY - minY) * S
    const cx = stageW / 2
    const cy = stageH / 2

    const placed: Placed[] = []
    for (const rk of Object.keys(m.rows)) {
      const row = m.rows[rk]
      const r = Number(rk)
      const n = row.cells.length
      row.cells.forEach((c) => {
        const dispW = c.w * S
        const dispH = c.h * S
        const offX = (c.x - minX) * S
        const offY = (c.y - minY) * S
        const ocx = offX + dispW / 2
        const ocy = offY + dispH / 2
        const cmpX = cx + (ocx - cx) * p.kx - dispW / 2
        const cmpY = cy + (ocy - cy) * p.ky - dispH / 2
        const order = r === 1 ? c.i : n - 1 - c.i // row1 L→R, row2 R→L
        placed.push({ ...c, row: r, dispW, dispH, offX, offY, cmpX, cmpY, settleDelay: p.base + order * p.step })
      })
    }
    const lastSettle = p.base + 9 * p.step + p.lock
    return { placed, stageW, stageH, lastSettle, poolByRow: { 1: m.rows['1'].pool, 2: m.rows['2'].pool } }
  }, [m, p])
}

function FlipCell({ cell, pool, spread, runId, tick, lock }: { cell: Placed; pool: string[]; spread: boolean; runId: number; tick: number; lock: number }) {
  const [src, setSrc] = useState(cell.file)
  const [tickKey, setTickKey] = useState(0)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets animation state before re-running the shuffle sequence
    setSettled(false)
    const iv = setInterval(() => {
      setSrc(pool[Math.floor(Math.random() * pool.length)])
      setTickKey((k) => k + 1)
    }, tick)
    const stop = setTimeout(() => {
      clearInterval(iv)
      setSrc(cell.file)
      setTickKey((k) => k + 1)
      setSettled(true)
    }, cell.settleDelay)
    return () => {
      clearInterval(iv)
      clearTimeout(stop)
    }
  }, [pool, cell.file, cell.settleDelay, runId, tick])

  const left = spread ? cell.offX : cell.cmpX
  const top = spread ? cell.offY : cell.cmpY

  return (
    <span
      className="flip-cell"
      data-settled={settled ? '1' : '0'}
      style={{ left, top, width: cell.dispW, height: cell.dispH, ['--flipdur' as string]: `${tick + 18}ms`, ['--lock' as string]: `${lock}ms` }}
    >
      <img key={tickKey} src={src} alt="" className="flip-glyph" />
    </span>
  )
}

export default function FlipDemo() {
  const [m, setM] = useState<Manifest | null>(null)
  const [presetIdx, setPresetIdx] = useState(1) // default B
  const [runId, setRunId] = useState(0)
  const [spread, setSpread] = useState(false)
  const p = PRESETS[presetIdx]
  const layout = useLayout(m, p)

  useEffect(() => {
    fetch('/assets/letters/manifest.json').then((r) => r.json()).then(setM)
  }, [])

  // run once on entering the page + on each replay/preset change: flip → spread
  useEffect(() => {
    if (!layout) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the spread animation before replaying it on layout/run change
    setSpread(false)
    const t = setTimeout(() => setSpread(true), layout.lastSettle + p.pause)
    return () => clearTimeout(t)
  }, [layout, runId, p.pause])

  const replay = useCallback(() => setRunId((r) => r + 1), [])
  const pick = useCallback((i: number) => {
    setPresetIdx(i)
    setRunId((r) => r + 1)
  }, [])

  return (
    <main className="flip-demo">
      <style>{`
        .flip-demo { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2.6rem;
          background: radial-gradient(120% 80% at 50% 34%, rgba(227,82,5,.10), transparent 60%), #0A0E27;
          color:#F5F5F5; font-family:var(--font-mono),monospace; padding:4rem 1rem; }
        .flip-stage { position:relative; filter:drop-shadow(0 0 34px rgba(227,82,5,.32)); }
        .flip-cell { position:absolute; display:flex; align-items:flex-end; justify-content:center; overflow:hidden; perspective:820px;
          transition: left var(--spread,680ms) cubic-bezier(.16,.84,.34,1), top var(--spread,680ms) cubic-bezier(.16,.84,.34,1); }
        .flip-glyph { height:100%; width:auto; display:block; transform-origin:center center; backface-visibility:hidden;
          animation: flipIn var(--flipdur,70ms) cubic-bezier(.2,.7,.3,1); }
        .flip-cell[data-settled="1"] .flip-glyph { animation: flipLock var(--lock,280ms) cubic-bezier(.2,.9,.25,1); }
        @keyframes flipIn { 0%{transform:rotateX(88deg);opacity:.15} 100%{transform:rotateX(0);opacity:1} }
        @keyframes flipLock { 0%{transform:rotateX(72deg) scale(1.02);opacity:.4} 60%{transform:rotateX(-8deg);opacity:1} 100%{transform:rotateX(0)} }
        .flip-meta { font-size:.6rem; letter-spacing:.28em; text-transform:uppercase; color:#6E6B5E }
        .flip-controls { display:flex; gap:.6rem; flex-wrap:wrap; justify-content:center; }
        .flip-preset { font-family:inherit; font-size:.6rem; letter-spacing:.14em; text-transform:uppercase; text-align:left;
          color:#B9B7AE; background:rgba(255,255,255,.02); border:1px solid rgba(227,82,5,.25);
          padding:.55rem .8rem; border-radius:2px; cursor:pointer; min-width:140px; line-height:1.5; }
        .flip-preset:hover { border-color:rgba(227,82,5,.6); color:#F5F5F5 }
        .flip-preset[data-active="1"] { border-color:#E35205; color:#E35205; background:rgba(227,82,5,.08) }
        .flip-preset small { display:block; color:#6E6B5E; letter-spacing:.06em; text-transform:none; font-size:.92em }
        .flip-row2 { display:flex; gap:.6rem; }
        .flip-btn { font-family:inherit; font-size:.62rem; letter-spacing:.22em; text-transform:uppercase;
          color:#E35205; background:transparent; border:1px solid rgba(227,82,5,.5); padding:.7rem 1.4rem; border-radius:2px; cursor:pointer }
        .flip-btn:hover { background:rgba(227,82,5,.12) }
      `}</style>

      <div className="flip-meta">{"// split-flap → spread — 试不同节奏"}</div>

      {layout ? (
        <div className="flip-stage" style={{ width: layout.stageW, height: layout.stageH, ['--spread' as string]: `${p.spread}ms` }}>
          {layout.placed.map((cell) => (
            <FlipCell key={cell.row * 100 + cell.i} cell={cell} pool={layout.poolByRow[cell.row as 1 | 2]} spread={spread} runId={runId} tick={p.tick} lock={p.lock} />
          ))}
        </div>
      ) : (
        <div className="flip-meta">loading glyphs…</div>
      )}

      <div className="flip-controls">
        {PRESETS.map((pr, i) => (
          <button key={pr.id} className="flip-preset" data-active={i === presetIdx ? '1' : '0'} onClick={() => pick(i)}>
            {pr.name}
            <small>{pr.desc}</small>
            <small>step {pr.step} · spread {pr.spread}</small>
          </button>
        ))}
      </div>

      <div className="flip-row2">
        <button className="flip-btn" onClick={replay}>↻ Replay 当前预设 ({p.id})</button>
      </div>
    </main>
  )
}
