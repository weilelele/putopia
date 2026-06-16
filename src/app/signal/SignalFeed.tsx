'use client'

import { useState } from 'react'
import { getInvestigationFeed, submitSignalResponse } from '@/lib/actions/signal-tasks'
import type {
  InvestigationFeedData,
  PublicInvestigation,
  PublicSignalTask,
  PublicSignalAsset,
} from '@/lib/actions/signal-tasks'

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
        <div style={{ color: '#E85D04', fontSize: 11, letterSpacing: '0.25em', marginBottom: 12 }}>{'// SIGNAL DISPATCH'}</div>
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
          <div style={{ color: '#E85D04', fontSize: 12, letterSpacing: '0.3em', marginBottom: 8 }}>{'// SIGNAL DISPATCH'}</div>
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
          {!feed.canParticipate && (
            <div style={{ fontSize: 11, color: '#E8A020', marginTop: 8, letterSpacing: '0.1em' }}>
              ● Browse only — Voyager+ can respond
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
              canParticipate={feed.canParticipate}
              onFiled={refresh}
            />
          ))
        )}
      </div>
    </main>
  )
}

export function InvestigationCard({
  investigation, canParticipate, onFiled, showTitle = true,
}: {
  investigation: PublicInvestigation
  canParticipate: boolean
  onFiled: () => void
  /** When false, the title is omitted (e.g. the world page already shows it in the hero). */
  showTitle?: boolean
}) {
  const [selectedDay, setSelectedDay] = useState(investigation.days.length - 1) // default: latest day

  const current = investigation.days[selectedDay]
  if (!current) return null

  const canGoBack = selectedDay > 0
  const canGoForward = selectedDay < investigation.days.length - 1

  return (
    <div style={{ marginBottom: 32 }}>
      {/* investigation header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: showTitle ? 'space-between' : 'flex-end', marginBottom: 16 }}>
        {showTitle && (
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '0.15em', color: '#F5F5F5', textTransform: 'uppercase' }}>
            {investigation.title}
          </h2>
        )}
        {/* day navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => canGoBack && setSelectedDay((d) => d - 1)}
            disabled={!canGoBack}
            style={{
              background: 'none', border: '1px solid rgba(255,107,53,0.3)', color: canGoBack ? 'rgba(245,245,245,0.7)' : 'rgba(245,245,245,0.15)',
              width: 28, height: 28, cursor: canGoBack ? 'pointer' : 'default', fontFamily: 'monospace', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >◀</button>
          <span style={{ fontSize: 12, color: 'rgba(245,245,245,0.55)', letterSpacing: '0.1em', minWidth: 48, textAlign: 'center' }}>
            DAY {current.dayIndex + 1}
          </span>
          <button
            onClick={() => canGoForward && setSelectedDay((d) => d + 1)}
            disabled={!canGoForward}
            style={{
              background: 'none', border: '1px solid rgba(255,107,53,0.3)', color: canGoForward ? 'rgba(245,245,245,0.7)' : 'rgba(245,245,245,0.15)',
              width: 28, height: 28, cursor: canGoForward ? 'pointer' : 'default', fontFamily: 'monospace', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >▶</button>
        </div>
      </div>

      {/* task for selected day */}
      <TaskCard
        key={current.task.id}
        task={current.task}
        canParticipate={canParticipate}
        onFiled={onFiled}
      />
    </div>
  )
}

function AssetView({ asset }: { asset: PublicSignalAsset }) {
  if (asset.media === 'video') {
    if (asset.display_url) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={asset.display_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#070912', display: 'block' }} />
    }
    return <video src={asset.processed_url || ''} controls loop muted playsInline style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#070912', display: 'block' }} />
  }
  if (asset.media === 'audio') {
    return (
      <div style={{ background: '#070912', padding: '28px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, aspectRatio: '1', justifyContent: 'center' }}>
        <span style={{ fontSize: 34 }}>🔊</span>
        <audio src={asset.processed_url || ''} controls style={{ width: '100%' }} />
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset.processed_url || ''} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#070912', display: 'block' }} />
}

const TYPE_HINT: Record<string, string> = {
  visual_match: 'Which signal comes from the same world as the reference?',
  visual_odd_one: 'Which signal does not belong to this group?',
  audio_odd_one: 'Which sound does not belong to this group?',
}

function TaskCard({ task, canParticipate, onFiled }: { task: PublicSignalTask; canParticipate: boolean; onFiled: () => void }) {
  const [pick, setPick] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const responded = !!task.mySelection
  const main = task.assets.find((a) => a.asset_role === 'main')
  const options = task.assets.filter((a) => a.asset_role !== 'main')
  const total = task.distribution ? Object.values(task.distribution).reduce((s, n) => s + n, 0) : 0
  const cols = `repeat(auto-fill, minmax(${options.length > 3 ? 160 : 200}px, 1fr))`

  const submit = async () => {
    if (!pick) return
    setBusy(true); setErr('')
    const r = await submitSignalResponse(task.id, pick)
    setBusy(false)
    if (!r.ok) { setErr(r.error || 'Submission failed'); return }
    onFiled()
  }

  return (
    <div style={{ background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6, color: 'rgba(245,245,245,0.85)' }}>
          {task.prompt || TYPE_HINT[task.type] || 'Make your judgment.'}
        </p>
        <span style={{ fontSize: 11, color: 'rgba(245,245,245,0.35)', marginLeft: 16, whiteSpace: 'nowrap' }}>
          {task.participantCount} response{task.participantCount !== 1 ? 's' : ''}
        </span>
      </div>

      {main && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: 'rgba(245,245,245,0.35)', letterSpacing: '0.15em', marginBottom: 6 }}>REFERENCE</div>
          <div style={{ maxWidth: 200, border: '1px solid rgba(255,107,53,0.25)' }}><AssetView asset={main} /></div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 10 }}>
        {options.map((a, i) => {
          const isMine = task.mySelection === a.id
          const isPicked = pick === a.id
          const count = task.distribution?.[a.id] ?? 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const selectable = canParticipate && !responded
          return (
            <div
              key={a.id}
              onClick={() => selectable && setPick(a.id)}
              style={{
                border: isMine ? '2px solid #20D890' : isPicked ? '2px solid #FF6B35' : '1px solid rgba(255,107,53,0.16)',
                background: '#070912', cursor: selectable ? 'pointer' : 'default', position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 2, background: 'rgba(7,9,18,0.8)', color: 'rgba(245,245,245,0.6)', fontSize: 10, padding: '2px 5px', letterSpacing: '0.08em' }}>
                {String.fromCharCode(65 + i)}
              </div>
              {isMine && <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, color: '#20D890', fontSize: 10 }}>✓ YOURS</div>}
              <AssetView asset={a} />
              {responded && task.distribution && (
                <div style={{ padding: '6px 8px' }}>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: isMine ? '#20D890' : '#E85D04' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(245,245,245,0.45)', marginTop: 3 }}>{pct}%</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 14 }}>
        {responded ? (
          <div style={{ fontSize: 11, color: '#20D890', letterSpacing: '0.05em' }}>● Response recorded.</div>
        ) : canParticipate ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={submit} disabled={!pick || busy}
              style={{ padding: '7px 18px', fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.12em', border: 'none', cursor: !pick || busy ? 'default' : 'pointer', background: !pick || busy ? 'rgba(255,107,53,0.25)' : '#FF6B35', color: '#070912' }}
            >{busy ? 'Submitting…' : 'SUBMIT'}</button>
            <span style={{ fontSize: 11, color: 'rgba(245,245,245,0.35)' }}>Submit to see how others responded</span>
            {err && <span style={{ fontSize: 11, color: '#E83030' }}>{err}</span>}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'rgba(245,245,245,0.4)' }}>
            <a href="/login" style={{ color: '#E85D04' }}>Log in</a> or become a Voyager to respond.
          </div>
        )}
      </div>
    </div>
  )
}
