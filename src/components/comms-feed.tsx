'use client'

import { useEffect, useRef, useState } from 'react'
import type { FeedLine, FeedEntity } from '@/lib/actions/dashboard-feed'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RenderedSegment {
  kind: 'text'
  content: string
  className?: string
}

interface RenderedAvatar {
  kind: 'avatar'
  entity: FeedEntity
}

type Segment = RenderedSegment | RenderedAvatar

interface RenderedLine {
  ts: string
  segments: Segment[]
}

// ── Parse a feed line into typed segments ────────────────────────────────────

function parseLineSegments(line: FeedLine): Segment[] {
  if (!line.entities?.length) return [{ kind: 'text', content: line.text }]

  // For each entity, split text around its name and insert avatar after it
  const segments: Segment[] = []
  let remaining = line.text

  // Sort entities by their position in the text (left to right)
  const positioned = line.entities
    .map(e => ({ entity: e, idx: remaining.indexOf(e.name) }))
    .filter(p => p.idx >= 0)
    .sort((a, b) => a.idx - b.idx)

  for (const { entity } of positioned) {
    const idx = remaining.indexOf(entity.name)
    if (idx < 0) continue
    if (idx > 0) segments.push({ kind: 'text', content: remaining.slice(0, idx) })
    segments.push({ kind: 'text', content: entity.name, className: entity.type === 'device' ? 'feed-hi-device' : 'feed-hi-voyager' })
    segments.push({ kind: 'avatar', entity })
    remaining = remaining.slice(idx + entity.name.length)
  }
  if (remaining) segments.push({ kind: 'text', content: remaining })
  return segments
}

// ── Avatar component ──────────────────────────────────────────────────────────

function InlineAvatar({ entity, show }: { entity: FeedEntity; show: boolean }) {
  const isVoyager = entity.type === 'voyager'
  const color = isVoyager ? '#FF8A5C' : '#C84406'
  const borderColor = isVoyager ? 'rgba(255,138,92,0.45)' : 'rgba(200,68,6,0.45)'
  const initials = entity.name.split(/[\s—–]/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <span style={{
      display: 'inline-block',
      width: 20, height: 20,
      borderRadius: '50%',
      overflow: 'hidden',
      border: `1px solid ${borderColor}`,
      verticalAlign: 'middle',
      position: 'relative', top: -1,
      margin: '0 3px',
      opacity: show ? 1 : 0,
      transform: show ? 'scale(1)' : 'scale(0.4)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      flexShrink: 0,
    }}>
      {entity.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entity.image_url} alt={entity.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%', display: 'block' }}>
          <rect width="40" height="40" fill="#0A0D1A" />
          <circle cx="20" cy="20" r="13" fill="none" stroke={color} strokeWidth="1.5" opacity="0.55" />
          <text x="20" y="25" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill={color}>{initials}</text>
        </svg>
      )}
    </span>
  )
}

// ── Typewriter logic ──────────────────────────────────────────────────────────

const CHAR_DELAY   = 30   // ms per character
const LINE_PAUSE   = 650  // ms between lines
const AVATAR_PAUSE = 280  // ms before avatar pops in

// State for one line being typed
interface LineState {
  ts: string
  segments: Segment[]
  charsDone: number      // chars typed so far in current text segment
  segIdx: number         // which segment we're on
  avatarShown: boolean   // whether current avatar segment has popped in
  done: boolean
}

export function CommsFeed({ lines }: { lines: FeedLine[] }) {
  const parsed = lines.map(l => ({ ts: l.ts, segments: parseLineSegments(l) }))

  // "completedLines" = lines fully typed (rendered as static)
  // "activeLine" = line currently being typed
  const [completedLines, setCompletedLines] = useState<RenderedLine[]>([])
  const [activeLine, setActiveLine] = useState<LineState | null>(null)
  const [allDone, setAllDone] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lineIdxRef = useRef(0)
  const activeRef = useRef<LineState | null>(null)

  useEffect(() => {
    if (!parsed.length) return
    // eslint-disable-next-line react-hooks/immutability -- drives the imperative typewriter via refs; intentional
    startNextLine()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function scroll() {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }

  function startNextLine() {
    const idx = lineIdxRef.current
    if (idx >= parsed.length) { setAllDone(true); return }

    const pl = parsed[idx]
    const state: LineState = { ts: pl.ts, segments: pl.segments, charsDone: 0, segIdx: 0, avatarShown: false, done: false }
    activeRef.current = state
    setActiveLine({ ...state })
    typeStep()
  }

  function typeStep() {
    const state = activeRef.current
    if (!state) return

    const seg = state.segments[state.segIdx]

    if (!seg) {
      // Line done
      state.done = true
      const finished = { ts: state.ts, segments: state.segments }
      lineIdxRef.current++
      timerRef.current = setTimeout(() => {
        setCompletedLines(prev => [...prev, finished])
        setActiveLine(null)
        scroll()
        timerRef.current = setTimeout(startNextLine, LINE_PAUSE)
      }, 80)
      return
    }

    if (seg.kind === 'text') {
      if (state.charsDone < seg.content.length) {
        state.charsDone++
        setActiveLine({ ...state })
        scroll()
        // eslint-disable-next-line react-hooks/purity -- random jitter on the typewriter delay; cosmetic only
        timerRef.current = setTimeout(typeStep, CHAR_DELAY + (Math.random() * 12 - 6))
      } else {
        // Move to next segment
        state.segIdx++
        state.charsDone = 0
        state.avatarShown = false
        setActiveLine({ ...state })
        typeStep()
      }
    } else if (seg.kind === 'avatar') {
      if (!state.avatarShown) {
        timerRef.current = setTimeout(() => {
          state.avatarShown = true
          setActiveLine({ ...state })
          timerRef.current = setTimeout(() => {
            state.segIdx++
            state.charsDone = 0
            state.avatarShown = false
            typeStep()
          }, 180)
        }, AVATAR_PAUSE)
      }
    }
  }

  // Render a completed or active line into React nodes
  function renderSegments(segs: Segment[], activeState?: LineState): React.ReactNode {
    return segs.map((seg, i) => {
      if (seg.kind === 'text') {
        const isCurrentSeg = activeState && i === activeState.segIdx
        const content = isCurrentSeg ? seg.content.slice(0, activeState.charsDone) : (activeState && i > activeState.segIdx ? '' : seg.content)
        return (
          <span key={i} className={seg.className}>{content}</span>
        )
      } else {
        // avatar
        const isCurrentSeg = activeState && i === activeState.segIdx
        const show = !activeState || (isCurrentSeg ? activeState.avatarShown : i < activeState.segIdx)
        return <InlineAvatar key={i} entity={seg.entity} show={show} />
      }
    })
  }

  return (
    <div className="comms-feed-wrap">
      {/* HUD tick rails */}
      <span className="comms-tick-left" />
      <span className="comms-tick-right" />

      {/* HUD header bar */}
      <div className="comms-feed-header">
        <span className="comms-feed-dot" />
        <span className="comms-feed-label">UPLINK // STATUS</span>
        <span className="comms-feed-date">{new Date().toISOString().slice(0,10).replace(/-/g,'.')}</span>
      </div>

      {/* Scrollable lines */}
      <div className="comms-feed-lines" ref={scrollRef}>
        {/* Completed lines */}
        {completedLines.map((line, i) => (
          <div key={i} className="comms-feed-line">
            <span className="comms-feed-ts">{line.ts}</span>
            <span className="comms-feed-text">{renderSegments(line.segments)}</span>
          </div>
        ))}

        {/* Active (being typed) line */}
        {activeLine && (
          <div className="comms-feed-line">
            <span className="comms-feed-ts">{activeLine.ts}</span>
            <span className="comms-feed-text">
              {renderSegments(activeLine.segments, activeLine)}
              {!allDone && <span className="comms-feed-cursor" />}
            </span>
          </div>
        )}

        {/* Cursor on last line when all done */}
        {allDone && !activeLine && (
          <span className="comms-feed-cursor" style={{ marginLeft: 2 }} />
        )}
      </div>
    </div>
  )
}
