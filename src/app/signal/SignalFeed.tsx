'use client'

import { useState, useEffect } from 'react'
import { BackLink } from '@/components/back-link'
import { LazyImage } from '@/components/lazy-image'
import { getInvestigationFeed, submitSignalResponse } from '@/lib/actions/signal-tasks'
import type {
  InvestigationFeedData,
  PublicInvestigation,
  PublicSignalTask,
  PublicSignalAsset,
  SearchingState,
} from '@/lib/actions/signal-tasks'
import { scanSecondsLeft } from '@/lib/signal/scan'

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(7,9,18,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0F1430', border: '1px solid rgba(255,107,53,0.25)',
          maxWidth: 480, width: '100%', padding: '32px 28px', position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 16,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(245,245,245,0.4)', fontSize: 18, lineHeight: 1, padding: 4,
          }}
        >✕</button>
        <div style={{ color: '#E85D04', fontSize: 'var(--fs-caption)', letterSpacing: '0.25em', marginBottom: 12 }}>{'// SIGNAL DISPATCH'}</div>
        <p style={{ fontSize: 14, color: 'rgba(245,245,245,0.85)', lineHeight: 1.9, margin: 0 }}>
          We&apos;ve intercepted a vast stream of disordered signals from across the multiverse.
          Your intuition is the only instrument that can make sense of them —
          help us decipher the noise, and connect to more parallel worlds.
        </p>
      </div>
    </div>
  )
}

export function InvestigationFeed({ initial }: { initial: InvestigationFeedData }) {
  const [feed, setFeed] = useState<InvestigationFeedData>(initial)
  const [aboutOpen, setAboutOpen] = useState(false)
  const refresh = async () => setFeed(await getInvestigationFeed())

  return (
    <main style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', padding: '32px 28px', fontFamily: 'var(--font-mono, monospace)', color: '#F5F5F5' }}>
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* header */}
        <div style={{ borderBottom: '1px solid rgba(255,107,53,0.2)', paddingBottom: 16, marginBottom: 28 }}>
          <BackLink href="/worlds" label="WORLD RECORDS" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '0.04em' }}>SIGNAL DISPATCH</h1>
            <button
              onClick={() => setAboutOpen(true)}
              title="What is this?"
              style={{
                width: 22, height: 22, borderRadius: '50%',
                border: '1px solid rgba(255,107,53,0.35)',
                background: 'transparent', cursor: 'pointer',
                color: 'rgba(245,245,245,0.45)', fontSize: 12,
                fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >?</button>
          </div>
          {!feed.loggedIn && (
            <div style={{ fontSize: 'var(--fs-caption)', color: '#E8A020', marginTop: 8, letterSpacing: '0.1em' }}>
              ● Browse only — <a href="/login" style={{ color: '#E85D04' }}>log in</a> to respond
            </div>
          )}
        </div>

        {feed.investigations.length === 0 ? (
          <div style={{ color: 'rgba(245,245,245,0.4)', fontSize: 14, padding: '48px 0', textAlign: 'center' }}>
            No active investigations.
          </div>
        ) : (
          feed.investigations.map((inv) => (
            <InvestigationCard
              key={inv.id}
              investigation={inv}
              onFiled={refresh}
            />
          ))
        )}
      </div>
    </main>
  )
}

export function InvestigationCard({
  investigation, onFiled, showTitle = true,
}: {
  investigation: PublicInvestigation
  onFiled: () => void
  /** When false, the title is omitted (e.g. the world page already shows it in the hero). */
  showTitle?: boolean
}) {
  const searching = investigation.searching
  const slots = investigation.days.length + (searching ? 1 : 0)
  const [selectedSlot, setSelectedSlot] = useState(slots - 1) // default: newest (the search, if present)

  const onSearching = !!searching && selectedSlot >= investigation.days.length
  const current = onSearching ? null : investigation.days[selectedSlot]
  if (!onSearching && !current) return null

  const canGoBack = selectedSlot > 0
  const canGoForward = selectedSlot < slots - 1

  return (
    <div style={{ marginBottom: 32 }}>
      {/* investigation header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: showTitle ? 'space-between' : 'flex-end', marginBottom: 16 }}>
        {showTitle && (
          investigation.worldId ? (
            <a
              href={`/worlds/${encodeURIComponent(investigation.worldId)}`}
              style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '0.15em', color: '#F5F5F5', textTransform: 'uppercase', textDecoration: 'none' }}
            >
              {investigation.title} <span style={{ color: '#E85D04', fontSize: 12 }}>→</span>
            </a>
          ) : (
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '0.15em', color: '#F5F5F5', textTransform: 'uppercase' }}>
              {investigation.title}
            </h2>
          )
        )}
        {/* day navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => canGoBack && setSelectedSlot((d) => d - 1)}
            disabled={!canGoBack}
            style={{
              background: 'none', border: '1px solid rgba(255,107,53,0.3)', color: canGoBack ? 'rgba(245,245,245,0.7)' : 'rgba(245,245,245,0.15)',
              width: 28, height: 28, cursor: canGoBack ? 'pointer' : 'default', fontFamily: 'monospace', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >◀</button>
          <span style={{ fontSize: 12, color: 'rgba(245,245,245,0.55)', letterSpacing: '0.1em', minWidth: 48, textAlign: 'center' }}>
            {onSearching ? 'SEARCHING' : `DAY ${current!.dayIndex + 1}`}
          </span>
          <button
            onClick={() => canGoForward && setSelectedSlot((d) => d + 1)}
            disabled={!canGoForward}
            style={{
              background: 'none', border: '1px solid rgba(255,107,53,0.3)', color: canGoForward ? 'rgba(245,245,245,0.7)' : 'rgba(245,245,245,0.15)',
              width: 28, height: 28, cursor: canGoForward ? 'pointer' : 'default', fontFamily: 'monospace', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >▶</button>
        </div>
      </div>

      {/* Architect preview: this day hasn't revealed to members yet. */}
      {current && !current.revealed && (
        <div style={{ fontSize: 11, color: '#E8A020', letterSpacing: '0.05em', marginBottom: 10 }}>
          ◷ Not yet revealed to members{current.revealAt ? ` — reveals ${new Date(current.revealAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
        </div>
      )}

      {/* Inter-day searching interstitial, else the task for the selected day */}
      {onSearching && searching ? (
        <SearchingPanel searching={searching} />
      ) : current ? (
        <TaskCard
          key={current.task.id}
          task={current.task}
          canParticipate={investigation.canParticipate}
          lockReason={investigation.lockReason}
          onFiled={onFiled}
        />
      ) : null}
    </div>
  )
}

function fmtCountdown(total: number): string {
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = Math.floor(total % 60)
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

// Inter-day "Signal Searching" interstitial — the previous day's crowd-chosen
// signal, the searching copy, and a countdown to the next reading (or a "came up
// empty" state once the window elapses with no next day published yet).
function SearchingPanel({ searching }: { searching: SearchingState }) {
  const [left, setLeft] = useState(() => scanSecondsLeft(searching.searchUntil))
  useEffect(() => {
    if (searching.failed) return
    const id = setInterval(() => setLeft(scanSecondsLeft(searching.searchUntil)), 1000)
    return () => clearInterval(id)
  }, [searching.searchUntil, searching.failed])

  const failed = searching.failed
  const accent = failed ? '#E83030' : '#FFB020'
  return (
    <div style={{ background: '#0F1430', border: `1px solid ${failed ? 'rgba(232,48,48,0.32)' : 'rgba(255,176,32,0.3)'}`, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent }} />
        <span style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color: accent }}>
          {failed ? 'SEARCH CAME UP EMPTY' : 'SIGNAL SEARCHING'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        {searching.prevAsset && (
          <div style={{ width: 72, flexShrink: 0, border: '1px solid rgba(255,107,53,0.25)' }}>
            <AssetView asset={searching.prevAsset} />
          </div>
        )}
        <div style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(245,245,245,0.72)' }}>
          Widening the sweep, guided by the signal everyone converged on in Day {searching.prevDayIndex + 1}.
        </div>
      </div>

      {failed ? (
        <div style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.5)', letterSpacing: '0.04em', lineHeight: 1.7 }}>
          No new reading has returned yet — the next signal will appear the moment it&apos;s found.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.16em', color: 'rgba(245,245,245,0.5)', marginBottom: 4 }}>NEXT SIGNAL IN</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.04em', color: '#F5F5F5', fontVariantNumeric: 'tabular-nums' }}>{fmtCountdown(left)}</div>
        </>
      )}
    </div>
  )
}

// Square dark slot that holds layout while the image lazy-loads + fades in over it.
function AssetImage({ src }: { src: string }) {
  return (
    <div style={{ width: '100%', aspectRatio: '1', background: '#070912', display: 'block' }}>
      <LazyImage src={src} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
    </div>
  )
}

function AssetView({ asset }: { asset: PublicSignalAsset }) {
  if (asset.media === 'video') {
    // Prefer the animated WebP (display_url); only fall back to a real <video>
    // element when there's no still, and don't pre-fetch its stream.
    if (asset.display_url) return <AssetImage src={asset.display_url} />
    return <video src={asset.processed_url || ''} controls loop muted playsInline preload="none" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#070912', display: 'block' }} />
  }
  if (asset.media === 'audio') {
    return (
      <div style={{ background: '#070912', padding: '28px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, aspectRatio: '1', justifyContent: 'center' }}>
        <span style={{ fontSize: 34 }}>🔊</span>
        <audio src={asset.processed_url || ''} controls preload="none" style={{ width: '100%' }} />
      </div>
    )
  }
  return <AssetImage src={asset.processed_url || ''} />
}

const TYPE_HINT: Record<string, string> = {
  visual_match: 'Which signal comes from the same world as the reference?',
  visual_odd_one: 'Which signal does not belong to this group?',
  audio_odd_one: 'Which sound does not belong to this group?',
  audio_match: 'Which sound comes from the same world as the reference?',
}

function TaskCard({ task, canParticipate, lockReason, onFiled }: { task: PublicSignalTask; canParticipate: boolean; lockReason?: string | null; onFiled: () => void }) {
  const [pick, setPick] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const responded = !!task.mySelection
  const main = task.assets.find((a) => a.asset_role === 'main')
  const options = task.assets.filter((a) => a.asset_role !== 'main')
  const total = task.distribution ? Object.values(task.distribution).reduce((s, n) => s + n, 0) : 0

  // The current front-runner (most-selected option) — flagged with a ★ once results show.
  const maxCount = task.distribution ? Math.max(0, ...options.map((a) => task.distribution?.[a.id] ?? 0)) : 0
  const leaderId = responded && task.distribution && maxCount > 0
    ? options.find((a) => (task.distribution?.[a.id] ?? 0) === maxCount)?.id ?? null
    : null

  const submit = async () => {
    if (!pick) return
    setBusy(true); setErr('')
    const r = await submitSignalResponse(task.id, pick)
    setBusy(false)
    if (!r.ok) { setErr(r.error || 'Submission failed'); return }
    onFiled()
  }

  return (
    <div style={{ background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)', padding: 16 }}>
      {/* Prompt spans the full width — the response count moved to the footer. */}
      <p style={{ fontSize: 14.5, margin: '0 0 14px', lineHeight: 1.6, color: 'rgba(245,245,245,0.88)' }}>
        {task.prompt || TYPE_HINT[task.type] || 'Make your judgment.'}
      </p>

      {main && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>REFERENCE</span>
          <div style={{ width: 64, flexShrink: 0, border: '1px solid rgba(255,107,53,0.25)' }}><AssetView asset={main} /></div>
        </div>
      )}

      {/* Signal fragments — a large 2x2 grid (no A/B/C/D labels) */}
      <div className="signal-options">
        {options.map((a) => {
          const isMine = task.mySelection === a.id
          const isPicked = pick === a.id
          const isLeader = a.id === leaderId
          const count = task.distribution?.[a.id] ?? 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const selectable = canParticipate && !responded
          return (
            <div
              key={a.id}
              onClick={() => selectable && setPick(a.id)}
              style={{
                border: isMine ? '2px solid #20D890' : isPicked ? '2px solid #FF6B35' : isLeader ? '1px solid rgba(232,93,4,0.5)' : '1px solid rgba(255,107,53,0.16)',
                background: '#070912', cursor: selectable ? 'pointer' : 'default', position: 'relative',
              }}
            >
              {isMine && <div style={{ position: 'absolute', top: 6, right: 7, zIndex: 2, color: '#20D890', fontSize: 14, lineHeight: 1 }}>✓</div>}
              <AssetView asset={a} />
              {responded && task.distribution && (
                <span style={{ position: 'absolute', left: 7, bottom: 7, zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(7,9,18,0.82)', padding: '2px 8px', borderRadius: 4 }}>
                  {isLeader && <span style={{ color: '#FF8A3D', fontSize: 'var(--fs-caption)', lineHeight: 1 }}>★</span>}
                  <span style={{ fontSize: 'var(--fs-caption)', fontWeight: isLeader ? 600 : 400, color: isLeader ? '#FF8A3D' : 'rgba(245,245,245,0.82)' }}>{pct}%</span>
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer — status on the left, response count anchored bottom-right. */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          {responded ? (
            <div style={{ fontSize: 'var(--fs-caption)', color: '#20D890', letterSpacing: '0.05em' }}>● Response recorded.</div>
          ) : canParticipate ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={submit} disabled={!pick || busy}
                style={{ padding: '7px 18px', fontFamily: 'inherit', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', border: 'none', cursor: !pick || busy ? 'default' : 'pointer', background: !pick || busy ? 'rgba(255,107,53,0.25)' : '#FF6B35', color: '#070912' }}
              >{busy ? 'Submitting…' : 'SUBMIT'}</button>
              {err && <span style={{ fontSize: 'var(--fs-caption)', color: '#E83030' }}>{err}</span>}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'rgba(245,245,245,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'rgba(245,245,245,0.5)' }}>🔒</span>
              {lockReason === 'Log in to respond'
                ? <span><a href="/login" style={{ color: '#E85D04' }}>Log in</a> to respond.</span>
                : <span>{lockReason || 'Voting is restricted for this world.'}</span>}
            </div>
          )}
        </div>
        <span style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {task.participantCount} response{task.participantCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
