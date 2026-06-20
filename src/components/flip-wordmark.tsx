'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Cell = { i: number; ch: string; file: string; x: number; y: number; w: number; h: number }
type Row = { word: string; y0: number; y1: number; rowHeight: number; cells: Cell[]; pool: string[] }
type Manifest = { imgW: number; imgH: number; rows: Record<string, Row> }

// ── Preset A · calm ──
const TICK = 64
const BASE = 760
const STEP = 300
const LOCK = 300
const PAUSE = 280
const SPREAD = 900
const KX = 0.8
const KY = 0.9

type Placed = Cell & {
  row: number
  offX: number
  offY: number
  cmpX: number
  cmpY: number
  settleDelay: number
}

type Geom = {
  cells: Placed[]
  spanW: number // original px span (un-scaled)
  spanH: number
  poolByRow: Record<number, string[]>
  lastSettle: number
}

function buildGeom(m: Manifest): Geom {
  const all: Cell[] = []
  for (const rk of Object.keys(m.rows)) for (const c of m.rows[rk].cells) all.push(c)
  const minX = Math.min(...all.map((c) => c.x))
  const minY = Math.min(...all.map((c) => c.y))
  const maxX = Math.max(...all.map((c) => c.x + c.w))
  const maxY = Math.max(...all.map((c) => c.y + c.h))
  const spanW = maxX - minX
  const spanH = maxY - minY
  const cx = spanW / 2
  const cy = spanH / 2
  const cells: Placed[] = []
  for (const rk of Object.keys(m.rows)) {
    const row = m.rows[rk]
    const r = Number(rk)
    const n = row.cells.length
    row.cells.forEach((c) => {
      const offX = c.x - minX
      const offY = c.y - minY
      const ocx = offX + c.w / 2
      const ocy = offY + c.h / 2
      const cmpX = cx + (ocx - cx) * KX - c.w / 2
      const cmpY = cy + (ocy - cy) * KY - c.h / 2
      const order = r === 1 ? c.i : n - 1 - c.i // row1 L→R, row2 R→L
      cells.push({ ...c, row: r, offX, offY, cmpX, cmpY, settleDelay: BASE + order * STEP })
    })
  }
  return {
    cells,
    spanW,
    spanH,
    poolByRow: { 1: m.rows['1'].pool, 2: m.rows['2'].pool },
    lastSettle: BASE + 9 * STEP + LOCK,
  }
}

function FlipCell({ cell, pool, spread, runId, scale }: { cell: Placed; pool: string[]; spread: boolean; runId: number; scale: number }) {
  const [src, setSrc] = useState(cell.file)
  const [tickKey, setTickKey] = useState(0)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets animation state before re-running the shuffle sequence
    setSettled(false)
    const iv = setInterval(() => {
      setSrc(pool[Math.floor(Math.random() * pool.length)])
      setTickKey((k) => k + 1)
    }, TICK)
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
  }, [pool, cell.file, cell.settleDelay, runId])

  const left = (spread ? cell.offX : cell.cmpX) * scale
  const top = (spread ? cell.offY : cell.cmpY) * scale

  return (
    <span
      className="fw-cell"
      data-settled={settled ? '1' : '0'}
      style={{ left, top, width: cell.w * scale, height: cell.h * scale }}
    >
      <img key={tickKey} src={src} alt="" className="fw-glyph" />
    </span>
  )
}

// Play the split-flap animation at most once per calendar day per browser. Repeat
// visits to the dashboard the same day render the static wordmark instead — the
// animated version mounts dozens of rapidly-src-swapping <img> cells, which is the
// main cost of re-entering the page.
const PLAY_KEY = 'mc-wordmark-played-on'

// Fired once the wordmark is done demanding resources — animation settled, or
// immediately in static mode. The dashboard listens for this to defer loading
// its heavy below-the-fold feed until the animation has the main thread to itself.
export const WORDMARK_READY_EVENT = 'mc:wordmark-ready'
function emitWordmarkReady() {
  try { window.dispatchEvent(new Event(WORDMARK_READY_EVENT)) } catch { /* SSR / no window */ }
}

export function FlipWordmark({
  maxWidth = 600,
  fill = 0.92,
  className,
  ariaLabel = 'Multiverse Collective',
  forceAnimate = false,
}: {
  maxWidth?: number
  fill?: number
  className?: string
  ariaLabel?: string
  /** Always replay the animation, ignoring the once-per-day gate (e.g. demos). */
  forceAnimate?: boolean
}) {
  const [m, setM] = useState<Manifest | null>(null)
  const [runId, setRunId] = useState(0)
  const [spread, setSpread] = useState(false)
  const [containerW, setContainerW] = useState(maxWidth)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Decide once-per-day (in an effect so render stays pure / SSR-safe), and only
  // fetch the glyph manifest when we're actually going to animate.
  useEffect(() => {
    let shouldAnimate = true
    try {
      const today = new Date().toISOString().slice(0, 10)
      shouldAnimate = forceAnimate || window.localStorage.getItem(PLAY_KEY) !== today
      if (shouldAnimate && !forceAnimate) window.localStorage.setItem(PLAY_KEY, today)
    } catch {
      shouldAnimate = true
    }
    if (!shouldAnimate) {
      // Static path: nothing heavy to load — let the page load its deferred
      // content right away. rAF so parent listeners are attached first.
      const raf = requestAnimationFrame(() => emitWordmarkReady())
      return () => cancelAnimationFrame(raf)
    }
    fetch('/assets/letters/manifest.json').then((r) => r.json()).then(setM).catch(() => {})
  }, [forceAnimate])

  const geom = useMemo(() => (m ? buildGeom(m) : null), [m])

  // Animating: signal "ready" once the cells have finished their flicker-settle,
  // so the page can load the heavy below-the-fold feed without competing with it.
  useEffect(() => {
    if (!geom) return
    const t = setTimeout(() => emitWordmarkReady(), geom.lastSettle)
    return () => clearTimeout(t)
  }, [geom])

  // responsive scale: fit container, capped at maxWidth
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth))
    ro.observe(el)
    setContainerW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const targetW = Math.min(maxWidth, containerW * fill)
  const scale = geom ? targetW / geom.spanW : 0

  // run once on mount + on replay
  useEffect(() => {
    if (!geom) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the spread animation before replaying it on geom/run change
    setSpread(false)
    const t = setTimeout(() => setSpread(true), geom.lastSettle + PAUSE)
    return () => clearTimeout(t)
  }, [geom, runId])

  const replay = useCallback(() => setRunId((r) => r + 1), [])

  const stageW = geom ? geom.spanW * scale : 0
  const stageH = geom ? geom.spanH * scale : 0

  return (
    <div ref={wrapRef} className={className} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <style>{`
        .fw-stage { position:relative; }
        .fw-cell { position:absolute; display:flex; align-items:flex-end; justify-content:center; overflow:hidden; perspective:820px;
          transition: left ${SPREAD}ms cubic-bezier(.16,.84,.34,1), top ${SPREAD}ms cubic-bezier(.16,.84,.34,1); }
        .fw-glyph { height:100%; width:auto; display:block; transform-origin:center center; backface-visibility:hidden;
          animation: fwFlip ${TICK + 18}ms cubic-bezier(.2,.7,.3,1); }
        .fw-cell[data-settled="1"] .fw-glyph { animation: fwLock ${LOCK}ms cubic-bezier(.2,.9,.25,1); }
        @keyframes fwFlip { 0%{transform:rotateX(88deg);opacity:.15} 100%{transform:rotateX(0);opacity:1} }
        @keyframes fwLock { 0%{transform:rotateX(72deg) scale(1.02);opacity:.4} 60%{transform:rotateX(-8deg);opacity:1} 100%{transform:rotateX(0)} }
      `}</style>
      {geom ? (
        <div
          className="fw-stage"
          role="img"
          aria-label={ariaLabel}
          onClick={replay}
          style={{ width: stageW, height: stageH, cursor: 'pointer' }}
        >
          {geom.cells.map((cell) => (
            <FlipCell key={cell.row * 100 + cell.i} cell={cell} pool={geom.poolByRow[cell.row]} spread={spread} runId={runId} scale={scale} />
          ))}
        </div>
      ) : (
        // graceful fallback before glyphs load: the original wordmark image
        <img src="/assets/vi-wordmark.png" alt={ariaLabel} style={{ width: Math.min(maxWidth, containerW * fill), height: 'auto' }} />
      )}
    </div>
  )
}
