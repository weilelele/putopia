'use client'

import { useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { FinalFormPanel } from '@/components/final-form-panel'
import {
  getFrequencies,
  getTask,
  setTaskPublished,
  updateTask,
  deleteTask,
  generateCandidates,
  setAssetSelected,
  setAssetRole,
  deleteAsset,
  listInvestigations,
  listTunableWorlds,
  promoteWorldToTuning,
  createWorldForTuning,
  addDayToInvestigation,
  listInvestigationTasks,
  listBandAssets,
  pullForgeAssets,
  sampleForgeAssets,
  storeForgeWasmCandidate,
  getInvestigationConfig,
  updateInvestigationConfig,
} from '@/lib/actions/signal-tasks'
import type {
  SignalTask,
  SignalTaskAsset,
  SignalTaskType,
  GenerateSource,
  InvestigationSummary,
  TunableWorld,
  InvestigationConfig,
} from '@/lib/actions/signal-tasks'
import type { CosmoFrequency } from '@/lib/cosmo'
import type { WorldVoteScope } from '@/types/database'
import type { CropShape, FilterPreset, CropConfig } from '@/lib/signal/presets'
import { FILTER_PRESETS } from '@/lib/signal/presets'
import { processForgeVideo, processForgeAudio } from '@/lib/signal/ffmpeg-wasm'
import { buildSchedule, hasOpened } from '@/lib/signal/reveal'

// Browser ffmpeg.wasm Forge step (shared by Pick + Random): fetch the Cosmo clip
// via the same-origin proxy, process it locally, then upload via a server action.
// Returns 'created', 'skipped' (audio with no track), or an error string.
async function processAndStoreForgeClip(
  kind: 'video' | 'audio',
  taskId: string,
  source: Record<string, unknown>,
  asset: { assetId: string; url: string },
  crop: Partial<CropConfig>,
  durationSec: number,
): Promise<'created' | 'skipped' | string> {
  const proxied = `/api/forge/cosmo-proxy?url=${encodeURIComponent(asset.url)}`
  try {
    const clip = kind === 'audio'
      ? await processForgeAudio(proxied, durationSec)
      : await processForgeVideo(proxied, crop, durationSec)
    if (!clip) return 'skipped' // audio with no track
    const fd = new FormData()
    fd.set('taskId', taskId)
    fd.set('kind', kind)
    fd.set('source', JSON.stringify({ ...source, assetId: asset.assetId, url: asset.url, ...(kind === 'video' ? { crop } : {}) }))
    fd.set('ext', clip.ext)
    fd.set('mime', clip.mime)
    const bytes = new Uint8Array(clip.data.byteLength) // ArrayBuffer-backed → valid BlobPart
    bytes.set(clip.data)
    fd.set('display', new Blob([bytes], { type: clip.mime }), `clip.${clip.ext}`)
    const r = await storeForgeWasmCandidate(fd)
    return r.ok ? 'created' : (r.error ?? 'store failed')
  } catch (e) {
    return (e as Error).message
  }
}

// Compact local datetime, e.g. "Jun 21, 14:30"
function fmtReveal(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── styles ───────────────────────────────────────────────────────────────────
const S = {
  card: { background: '#151B3A', border: '1px solid rgba(255,107,53,0.16)', padding: '18px', marginBottom: '12px' } as const,
  label: { display: 'block', color: 'rgba(245,245,245,0.35)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '4px' } as const,
  input: { width: '100%', background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)', color: '#F5F5F5', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const } as const,
  area: { width: '100%', background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)', color: '#F5F5F5', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const, minHeight: 60 } as const,
  sel: { background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)', color: '#F5F5F5', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none' } as const,
  btn: { padding: '6px 14px', fontFamily: 'monospace', fontSize: '11px', letterSpacing: '0.1em', cursor: 'pointer', border: 'none' } as const,
  btnOk: { background: '#FF6B35', color: '#070912' } as const,
  btnGhost: { background: 'transparent', border: '1px solid rgba(255,107,53,0.3)', color: 'rgba(245,245,245,0.55)' } as const,
  btnDanger: { background: 'transparent', border: '1px solid rgba(232,48,48,0.4)', color: '#E83030' } as const,
}

const TYPE_LABELS: Record<SignalTaskType, string> = {
  visual_match: 'VISUAL · Match',
  visual_odd_one: 'VISUAL · Odd One Out',
  audio_odd_one: 'AUDIO · Odd One Out',
  audio_match: 'AUDIO · Match',
}

const VOTE_SCOPE_LABELS: Record<WorldVoteScope, string> = {
  self: 'Owner only (private)',
  voters: 'Voyagers only',
  all: 'All registered users',
}


const SHAPES: CropShape[] = ['square', 'circle', 'rect']

const FILTER_LABELS: Record<FilterPreset, string> = {
  signal_decay: 'Signal Decay (pixelate + noise)',
  chromatic: 'Chromatic (RGB channel split)',
  glitch_art: 'Glitch Art (slice displacement)',
  static_noise: 'Static Noise (heavy grain)',
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function SignalTasksAdmin() {
  const [freqs, setFreqs] = useState<CosmoFrequency[]>([])
  const [freqsLoading, setFreqsLoading] = useState(true)
  const [investigations, setInvestigations] = useState<InvestigationSummary[]>([])
  const [activeInvId, setActiveInvId] = useState<string | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [newInvOpen, setNewInvOpen] = useState(false)

  const refreshInvestigations = useCallback(async () => {
    setInvestigations(await listInvestigations())
  }, [])

  useEffect(() => {
    getFrequencies().then((f) => { setFreqs(f); setFreqsLoading(false) })
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional initial fetch; refreshInvestigations is the shared reloader
    refreshInvestigations()
  }, [refreshInvestigations])

  const activeInv = investigations.find((i) => i.id === activeInvId) ?? null

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Left: investigation list */}
      <div style={{ width: 240, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: '#E85D04', fontSize: 11, letterSpacing: '0.2em' }}>INVESTIGATIONS</span>
          <button style={{ ...S.btn, ...S.btnOk, padding: '4px 10px' }} onClick={() => setNewInvOpen((o) => !o)}>
            {newInvOpen ? '✕' : '+ NEW'}
          </button>
        </div>

        {newInvOpen && (
          <NewInvestigationForm
            onCreated={async (id) => {
              setNewInvOpen(false)
              await refreshInvestigations()
              setActiveInvId(id)
              setActiveTaskId(null)
            }}
          />
        )}

        {investigations.length === 0 && !newInvOpen && (
          <div style={{ color: 'rgba(245,245,245,0.3)', fontSize: 12 }}>No investigations yet.</div>
        )}

        {investigations.map((inv) => (
          <button
            key={inv.id}
            onClick={() => { setActiveInvId(inv.id); setActiveTaskId(null) }}
            style={{
              ...S.card, width: '100%', textAlign: 'left', cursor: 'pointer', padding: '10px 12px',
              borderColor: activeInvId === inv.id ? 'rgba(255,107,53,0.5)' : 'rgba(255,107,53,0.16)',
            }}
          >
            <div style={{ fontSize: 12, color: '#F5F5F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {inv.title || '(untitled)'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(245,245,245,0.35)', marginTop: 3, letterSpacing: '0.06em' }}>
              SIGNAL TUNING · {inv.dayCount} day{inv.dayCount !== 1 ? 's' : ''}
            </div>
          </button>
        ))}
      </div>

      {/* Middle: day list for selected investigation */}
      {activeInvId && (
        <div style={{ width: 200, flexShrink: 0 }}>
          <DayList
            key={activeInvId}
            investigationId={activeInvId}
            investigationTitle={activeInv?.title ?? ''}
            activeTaskId={activeTaskId}
            onSelectTask={setActiveTaskId}
            onDayAdded={async (id) => {
              await refreshInvestigations()
              setActiveTaskId(id)
            }}
          />
        </div>
      )}

      {/* Right: task editor */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {freqsLoading && <div style={{ color: 'rgba(245,245,245,0.4)', fontSize: 12, marginBottom: 12 }}>Loading Cosmo catalog…</div>}
        {activeInvId && <InvestigationConfigBar key={activeInvId} threadId={activeInvId} />}
        {!activeInvId && (
          <div style={{ color: 'rgba(245,245,245,0.3)', fontSize: 13, paddingTop: 60, textAlign: 'center' }}>
            Select an investigation on the left.
          </div>
        )}
        {activeInvId && !activeTaskId && (
          <div style={{ color: 'rgba(245,245,245,0.3)', fontSize: 13, paddingTop: 60, textAlign: 'center' }}>
            Select a day or click + Add Day.
          </div>
        )}
        {activeTaskId && (
          <TaskEditor
            key={activeTaskId}
            taskId={activeTaskId}
            freqs={freqs}
            onChanged={refreshInvestigations}
            onDeleted={async () => { setActiveTaskId(null); await refreshInvestigations() }}
          />
        )}
      </div>
    </div>
  )
}

// ─── New investigation form (promote a world, or seed a new one) ──────────────
function NewInvestigationForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [mode, setMode] = useState<'promote' | 'create'>('promote')
  const [worlds, setWorlds] = useState<TunableWorld[]>([])
  const [worldId, setWorldId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [voteScope, setVoteScope] = useState<WorldVoteScope>('all')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listTunableWorlds().then((w) => {
      setWorlds(w)
      if (w.length) setWorldId(w[0].id)
      else setMode('create') // nothing to promote → default to seeding
    })
  }, [])

  const selectedWorld = worlds.find((w) => w.id === worldId)
  const canSubmit = mode === 'promote' ? !!worldId : !!name.trim()

  const submit = async () => {
    setBusy(true)
    const r = mode === 'promote'
      ? await promoteWorldToTuning({ worldId, voteScope })
      : await createWorldForTuning({ name: name.trim(), description: description.trim(), voteScope })
    setBusy(false)
    if (!r.ok || !r.id) { alert(r.error || 'Failed'); return }
    onCreated(r.id)
  }

  return (
    <div style={{ ...S.card, padding: 12, marginBottom: 12 }}>
      {/* mode toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button
          style={{ ...S.btn, flex: 1, ...(mode === 'promote' ? S.btnOk : S.btnGhost) }}
          onClick={() => setMode('promote')}
        >Promote World</button>
        <button
          style={{ ...S.btn, flex: 1, ...(mode === 'create' ? S.btnOk : S.btnGhost) }}
          onClick={() => setMode('create')}
        >New World</button>
      </div>

      {mode === 'promote' ? (
        worlds.length === 0 ? (
          <div style={{ fontSize: 11, color: 'rgba(245,245,245,0.4)', marginBottom: 10 }}>
            No proposed worlds to promote. Use “New World” to seed one.
          </div>
        ) : (
          <>
            <label style={S.label}>INITIAL VISION</label>
            <select style={{ ...S.sel, width: '100%', marginBottom: 8 }} value={worldId} onChange={(e) => setWorldId(e.target.value)}>
              {worlds.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {selectedWorld?.description && (
              <div style={{
                fontSize: 11, lineHeight: 1.55, color: 'rgba(245,245,245,0.5)',
                background: '#0F1430', border: '1px solid rgba(255,107,53,0.1)', padding: '7px 9px',
                marginBottom: 10, maxHeight: 96, overflowY: 'auto', whiteSpace: 'pre-wrap',
              }}>
                {selectedWorld.description}
              </div>
            )}
          </>
        )
      ) : (
        <>
          <label style={S.label}>WORLD NAME</label>
          <input style={{ ...S.input, marginBottom: 8 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Glass Sea" />
          <label style={S.label}>INITIAL VISION (optional)</label>
          <textarea style={{ ...S.area, marginBottom: 8, minHeight: 48 }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="The creator's initial vision…" />
        </>
      )}

      <label style={S.label}>WHO CAN VOTE</label>
      <select style={{ ...S.sel, width: '100%', marginBottom: 10 }} value={voteScope} onChange={(e) => setVoteScope(e.target.value as WorldVoteScope)}>
        {Object.entries(VOTE_SCOPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>

      <button
        style={{ ...S.btn, ...S.btnOk, opacity: !canSubmit || busy ? 0.5 : 1, width: '100%' }}
        disabled={!canSubmit || busy}
        onClick={submit}
      >{busy ? 'Working…' : mode === 'promote' ? 'Promote to Tuning' : 'Create & Tune'}</button>
    </div>
  )
}

// ─── Investigation config bar (owner vote scope) ──────────────────────────────
function InvestigationConfigBar({ threadId }: { threadId: string }) {
  const [cfg, setCfg] = useState<InvestigationConfig | null>(null)
  const [visionOpen, setVisionOpen] = useState(false)

  const reload = useCallback(async () => { setCfg(await getInvestigationConfig(threadId)) }, [threadId])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional refetch when threadId changes; reload is the shared loader
  useEffect(() => { reload() }, [reload])

  if (!cfg) return null

  const patch = async (p: { voteScope?: WorldVoteScope; gapHours?: number }) => {
    await updateInvestigationConfig(threadId, p)
    await reload()
  }

  return (
    <div style={{ ...S.card, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: '#F5F5F5', fontWeight: 600 }}>{cfg.title}</div>
          <div style={{ fontSize: 10, color: 'rgba(245,245,245,0.35)', letterSpacing: '0.08em', marginTop: 2 }}>
            SIGNAL TUNING
          </div>
        </div>
        <div>
          <label style={S.label}>WHO CAN VOTE</label>
          <select style={{ ...S.sel, fontSize: 12 }} value={cfg.voteScope} onChange={(e) => patch({ voteScope: e.target.value as WorldVoteScope })}>
            {Object.entries(VOTE_SCOPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      {/* Tuning cadence — the first question opens at the world's scan end; each
          question runs a fixed 24h, then this gap before the next. */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,107,53,0.12)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <label style={S.label}>VOTING WINDOW</label>
          <div style={{ fontSize: 11, color: 'rgba(245,245,245,0.55)', padding: '5px 0' }}>{cfg.voteWindowHours}h (fixed)</div>
        </div>
        <div>
          <label style={S.label}>GAP BETWEEN QUESTIONS (HOURS)</label>
          <input
            type="number" min={0} defaultValue={cfg.gapHours}
            style={{ ...S.input, width: 80, padding: '5px 8px' }}
            onBlur={(e) => { const v = Number(e.target.value); if (v >= 0 && v !== cfg.gapHours) patch({ gapHours: v }) }}
          />
        </div>
      </div>
      {cfg.visionText && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setVisionOpen((v) => !v)}
            style={{ ...S.btn, ...S.btnGhost, padding: '3px 8px', fontSize: 10 }}
          >{visionOpen ? '▲ Hide initial vision' : '▼ Initial vision'}</button>
          {visionOpen && (
            <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.6, color: 'rgba(245,245,245,0.55)', whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto' }}>
              {cfg.visionText}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Day list for an investigation ────────────────────────────────────────────
function DayList({
  investigationId, investigationTitle, activeTaskId, onSelectTask, onDayAdded,
}: {
  investigationId: string
  investigationTitle: string
  activeTaskId: string | null
  onSelectTask: (id: string) => void
  onDayAdded: (id: string) => void
}) {
  const [tasks, setTasks] = useState<SignalTask[]>([])
  const [cfg, setCfg] = useState<InvestigationConfig | null>(null)
  const [busy, setBusy] = useState(false)
  const [finalOpen, setFinalOpen] = useState(false)

  const reload = useCallback(async () => {
    const [t, c] = await Promise.all([listInvestigationTasks(investigationId), getInvestigationConfig(investigationId)])
    setTasks(t)
    setCfg(c)
  }, [investigationId])

  // Reload when a day's publish state may have changed (anchor / reveal shifts).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional refetch on activeTaskId change; reload is the shared loader
  useEffect(() => { reload() }, [reload, activeTaskId])

  const addDay = async () => {
    setBusy(true)
    const r = await addDayToInvestigation(investigationId)
    setBusy(false)
    if (!r.ok || !r.id) { alert(r.error || 'Failed'); return }
    await reload()
    onDayAdded(r.id)
  }

  // Resolve each day's open time via the gap chain (anchor = restart, else scan end).
  const anchorAt = cfg?.revealAnchorAt ?? cfg?.scanUntil ?? null
  const schedule = buildSchedule(
    anchorAt,
    cfg?.gapHours ?? 4,
    tasks.filter((t) => t.is_published && t.published_at).map((t) => ({ dayIndex: t.day_index ?? 0, publishedAtISO: t.published_at! })),
  )
  const openByDay = new Map(schedule.map((s) => [s.dayIndex, s.openAt]))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ color: '#E85D04', fontSize: 11, letterSpacing: '0.15em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
          {investigationTitle || 'DAYS'}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            style={{ ...S.btn, ...S.btnGhost, padding: '3px 8px', color: finalOpen ? '#20D890' : undefined }}
            onClick={() => setFinalOpen((v) => !v)}
          >Final Form</button>
          <button
            style={{ ...S.btn, ...S.btnGhost, padding: '3px 8px', opacity: busy ? 0.5 : 1 }}
            disabled={busy}
            onClick={addDay}
          >{busy ? '…' : '+ Day'}</button>
        </div>
      </div>

      {finalOpen && cfg?.worldId && <FinalFormPanel worldId={cfg.worldId} />}

      {tasks.length === 0 && (
        <div style={{ fontSize: 11, color: 'rgba(245,245,245,0.3)' }}>No days yet — click + Day.</div>
      )}

      {tasks.map((t) => {
        const dayNum = (t.day_index ?? 0) + 1
        const isActive = t.id === activeTaskId
        // Reveal status for the badge — from the gap chain.
        const openAt = openByDay.get(t.day_index ?? 0)
        let status: { label: string; color: string }
        if (!t.is_published) {
          status = { label: '○ DRAFT', color: 'rgba(245,245,245,0.3)' }
        } else if (hasOpened(openAt ?? null)) {
          status = { label: '● LIVE', color: '#20D890' }
        } else {
          status = { label: openAt ? `◷ ${fmtReveal(openAt)}` : '◷ scheduled', color: '#E8A020' }
        }
        return (
          <button
            key={t.id}
            onClick={() => onSelectTask(t.id)}
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer', padding: '8px 10px',
              background: isActive ? 'rgba(255,107,53,0.1)' : '#0F1430',
              border: `1px solid ${isActive ? 'rgba(255,107,53,0.4)' : 'rgba(255,107,53,0.1)'}`,
              marginBottom: 4, display: 'block',
            }}
          >
            <div style={{ fontSize: 12, color: isActive ? '#FF6B35' : '#F5F5F5', letterSpacing: '0.08em' }}>
              Day {dayNum}
            </div>
            <div style={{ fontSize: 10, color: status.color, marginTop: 2 }}>
              {status.label}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Task editor ──────────────────────────────────────────────────────────────
function TaskEditor({
  taskId, freqs, onChanged, onDeleted,
}: {
  taskId: string
  freqs: CosmoFrequency[]
  onChanged: () => void
  onDeleted: () => void
}) {
  const [task, setTask] = useState<SignalTask | null>(null)
  const [assets, setAssets] = useState<SignalTaskAsset[]>([])
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const r = await getTask(taskId)
    if (r) { setTask(r.task); setAssets(r.assets); setPrompt(r.task.prompt || '') }
    setLoading(false)
  }, [taskId])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional refetch when taskId changes; reload is the shared loader
  useEffect(() => { reload() }, [reload])

  if (loading) return <div style={{ color: 'rgba(245,245,245,0.4)', fontSize: 12 }}>Loading…</div>
  if (!task) return <div style={{ color: '#E83030', fontSize: 12 }}>Task not found.</div>

  const dayNum = (task.day_index ?? 0) + 1
  const selectedCount = assets.filter((a) => a.is_selected).length

  return (
    <div>
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: '#E85D04', fontSize: 12, letterSpacing: '0.2em' }}>
            DAY {dayNum} · {task.task_date}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{ ...S.btn, ...(task.is_published ? S.btnGhost : S.btnOk) }}
              onClick={async () => { await setTaskPublished(taskId, !task.is_published); await reload(); onChanged() }}
            >{task.is_published ? '○ Unpublish' : '● Publish'}</button>
            <button
              style={{ ...S.btn, ...S.btnDanger }}
              onClick={async () => { if (confirm('Delete this day and all its assets?')) { await deleteTask(taskId); onDeleted() } }}
            >Delete</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
          <div>
            <label style={S.label}>TYPE (this day)</label>
            <select
              style={{ ...S.sel, fontSize: 12 }}
              value={task.type}
              onChange={async (e) => {
                if (assets.length && !confirm('Changing the type may not match the existing candidates in this day. Continue?')) return
                await updateTask(taskId, { type: e.target.value as SignalTaskType }); await reload(); onChanged()
              }}
            >
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>DATE</label>
            <input
              type="date" style={{ ...S.input, width: 140 }}
              value={task.task_date}
              onChange={async (e) => { await updateTask(taskId, { task_date: e.target.value }); await reload(); onChanged() }}
            />
          </div>
        </div>
        <label style={S.label}>PROMPT</label>
        <textarea style={S.area} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Write the puzzle prompt…" />
        <button
          style={{ ...S.btn, ...S.btnGhost, marginTop: 8 }}
          onClick={async () => { await updateTask(taskId, { prompt }); await reload(); onChanged() }}
        >Save prompt</button>
        {task.is_published && selectedCount === 0 && (
          <div style={{ marginTop: 8, fontSize: 11, color: '#E8A020' }}>⚠ Published but no assets selected — members will see nothing.</div>
        )}
      </div>

      <Generator taskId={taskId} freqs={freqs} taskType={task.type} onGenerated={reload} />

      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ color: '#E85D04', fontSize: 12, letterSpacing: '0.2em' }}>CANDIDATE POOL</span>
          <span style={{ fontSize: 11, color: 'rgba(245,245,245,0.4)' }}>
            {assets.length} total · <span style={{ color: '#20D890' }}>{selectedCount}</span> live
          </span>
        </div>
        {assets.length === 0 ? (
          <div style={{ color: 'rgba(245,245,245,0.3)', fontSize: 12 }}>No candidates yet — use the generator above.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {assets.map((a) => (
              <AssetCard key={a.id} asset={a} showRole={task.type === 'visual_match' || task.type === 'audio_match'} onChanged={reload} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Generator ────────────────────────────────────────────────────────────────
function Generator({ taskId, freqs, taskType, onGenerated }: { taskId: string; freqs: CosmoFrequency[]; taskType: SignalTaskType; onGenerated: () => void }) {
  const audioMode = taskType === 'audio_odd_one' || taskType === 'audio_match'
  const [mode, setMode] = useState<'random' | 'pick'>('random')

  // shared processing settings
  const [shape, setShape] = useState<CropShape>('square')
  const [areaRatio, setAreaRatio] = useState(0.17)
  const [glitch, setGlitch] = useState(50)
  const [filter, setFilter] = useState<FilterPreset>('signal_decay')
  const [durationSec, setDurationSec] = useState(4)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')

  // random mode
  const [sources, setSources] = useState<GenerateSource[]>([])

  const defaultMedia: 'image' | 'video' = audioMode ? 'video' : 'image'
  const pickBandFor = (f: CosmoFrequency | undefined, media: 'image' | 'video') =>
    f?.bands.find((x) => (media === 'image' ? x.imageCount > 0 : x.videoCount > 0)) || f?.bands[0]

  const addSource = () => {
    if (sources.length >= 3 || !freqs[0]) return
    const f = freqs[0]; const b = pickBandFor(f, defaultMedia)
    if (!b) return
    setSources((s) => [...s, { channelId: f.channelId, channelName: f.name, freq: f.freq, bandId: b.bandId, bandName: b.name, media: defaultMedia, count: 4 }])
  }
  const updateSource = (i: number, patch: Partial<GenerateSource>) => setSources((s) => s.map((x, idx) => idx === i ? { ...x, ...patch } : x))
  const removeSource = (i: number) => setSources((s) => s.filter((_, idx) => idx !== i))
  const onPickFreq = (i: number, channelId: string) => {
    const f = freqs.find((x) => x.channelId === channelId); if (!f) return
    const b = pickBandFor(f, sources[i].media)
    updateSource(i, { channelId, channelName: f.name, freq: f.freq, bandId: b?.bandId || '', bandName: b?.name || '' })
  }
  const onPickBand = (i: number, bandId: string) => {
    const f = freqs.find((x) => x.channelId === sources[i].channelId)
    const b = f?.bands.find((x) => x.bandId === bandId)
    updateSource(i, { bandId, bandName: b?.name || '' })
  }
  const runRandom = async () => {
    if (!sources.length) return
    setBusy(true); setResult('')
    const crop = { shape, areaRatio, glitchIntensity: glitch, filter }
    let created = 0, skipped = 0
    const errors: string[] = []

    // Image sources still process server-side (sharp, no ffmpeg). Audio mode and
    // video sources are processed in the browser (ffmpeg.wasm) — same path as Pick.
    const imageSources = audioMode ? [] : sources.filter((s) => s.media === 'image')
    const wasmSources = audioMode ? sources : sources.filter((s) => s.media === 'video')

    if (imageSources.length) {
      const r = await generateCandidates(taskId, imageSources, crop, { durationSec })
      created += r.created
      errors.push(...r.errors)
    }

    if (wasmSources.length) {
      const kind: 'video' | 'audio' = audioMode ? 'audio' : 'video'
      const { groups, errors: sErr } = await sampleForgeAssets(taskId, wasmSources)
      errors.push(...sErr)
      const total = groups.reduce((n, g) => n + g.assets.length, 0)
      let done = 0
      for (const g of groups) {
        let made = 0
        for (const a of g.assets) {
          if (made >= g.count) break // honour per-source count (audio oversamples)
          done++
          setResult(`Processing ${done}/${total}… (first clip also loads ffmpeg, ~10–20s)`)
          const res = await processAndStoreForgeClip(kind, taskId, g.source as Record<string, unknown>, a, crop, durationSec)
          if (res === 'created') { created++; made++ }
          else if (res === 'skipped') skipped++
          else errors.push(`${a.assetId}: ${res}`)
        }
      }
    }

    setBusy(false)
    setResult(`Pulled ${created} candidate(s)` + (skipped ? ` · ${skipped} skipped (no audio)` : '') + (errors.length ? ` · ${errors.length} error(s): ${errors.join(' | ')}` : ''))
    onGenerated()
  }

  const cropProps = { shape, setShape, areaRatio, setAreaRatio, glitch, setGlitch, filter, setFilter, durationSec, setDurationSec, audioMode }
  const showClip = (videoInPlay: boolean) => audioMode || videoInPlay

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button style={{ ...S.btn, flex: 1, ...(mode === 'random' ? S.btnOk : S.btnGhost) }} onClick={() => { setMode('random'); setResult('') }}>Random pull</button>
        <button style={{ ...S.btn, flex: 1, ...(mode === 'pick' ? S.btnOk : S.btnGhost) }} onClick={() => { setMode('pick'); setResult('') }}>Pick from Forge</button>
      </div>

      {mode === 'random' ? (
        <>
          {sources.map((src, i) => {
            const f = freqs.find((x) => x.channelId === src.channelId)
            return (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <select style={{ ...S.sel, maxWidth: 180 }} value={src.channelId} onChange={(e) => onPickFreq(i, e.target.value)}>
                  {freqs.map((fr) => <option key={fr.channelId} value={fr.channelId}>{fr.freq != null ? `${fr.freq} · ${fr.name}` : `${fr.name} (unscheduled)`}</option>)}
                </select>
                <select style={{ ...S.sel, maxWidth: 160 }} value={src.bandId} onChange={(e) => onPickBand(i, e.target.value)}>
                  {(f?.bands || []).map((b) => <option key={b.bandId} value={b.bandId}>{b.name} ({b.imageCount}i/{b.videoCount}v)</option>)}
                </select>
                {!audioMode && (
                  <select style={{ ...S.sel, maxWidth: 80 }} value={src.media} onChange={(e) => updateSource(i, { media: e.target.value as 'image' | 'video' })}>
                    <option value="image">image</option>
                    <option value="video">video</option>
                  </select>
                )}
                <input type="number" min={1} max={20} style={{ ...S.input, width: 52 }} value={src.count} onChange={(e) => updateSource(i, { count: Math.max(1, Number(e.target.value)) })} />
                <button style={{ ...S.btn, ...S.btnDanger, padding: '4px 8px' }} onClick={() => removeSource(i)}>×</button>
              </div>
            )
          })}
          <button style={{ ...S.btn, ...S.btnGhost, marginBottom: 10 }} onClick={addSource} disabled={sources.length >= 3 || !freqs.length}>+ Add source (max 3)</button>

          <CropSettings {...cropProps} showClip={showClip(sources.some((s) => s.media === 'video'))} />

          <button style={{ ...S.btn, ...S.btnOk, opacity: busy || !sources.length ? 0.5 : 1 }} disabled={busy || !sources.length} onClick={runRandom}>
            {busy ? 'Pulling…' : '⚡ Pull random candidates'}
          </button>
        </>
      ) : (
        <ForgePicker
          taskId={taskId} freqs={freqs} audioMode={audioMode}
          crop={{ shape, areaRatio, glitchIntensity: glitch, filter }} durationSec={durationSec}
          settings={<CropSettings {...cropProps} showClip={true} />}
          busy={busy} setBusy={setBusy}
          onResult={(r) => { setResult(r); onGenerated() }}
        />
      )}

      {result && <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(245,245,245,0.6)' }}>{result}</div>}
    </div>
  )
}

// ─── Shared crop/processing settings ──────────────────────────────────────────
function CropSettings({
  shape, setShape, areaRatio, setAreaRatio, glitch, setGlitch, filter, setFilter,
  durationSec, setDurationSec, audioMode, showClip,
}: {
  shape: CropShape; setShape: (v: CropShape) => void
  areaRatio: number; setAreaRatio: (v: number) => void
  glitch: number; setGlitch: (v: number) => void
  filter: FilterPreset; setFilter: (v: FilterPreset) => void
  durationSec: number; setDurationSec: (v: number) => void
  audioMode: boolean; showClip: boolean
}) {
  return (
    <>
      {!audioMode && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10, alignItems: 'flex-end' }}>
          <div>
            <label style={S.label}>FILTER</label>
            <select style={S.sel} value={filter} onChange={(e) => setFilter(e.target.value as FilterPreset)}>
              {FILTER_PRESETS.map((p) => <option key={p} value={p}>{FILTER_LABELS[p]}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>SHAPE</label>
            <select style={S.sel} value={shape} onChange={(e) => setShape(e.target.value as CropShape)}>
              {SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>CROP {(areaRatio * 100).toFixed(0)}%</label>
            <input type="range" min={5} max={40} value={Math.round(areaRatio * 100)} onChange={(e) => setAreaRatio(Number(e.target.value) / 100)} style={{ accentColor: '#FF6B35', width: 120 }} />
          </div>
          <div>
            <label style={S.label}>GLITCH {glitch}</label>
            <input type="range" min={0} max={100} value={glitch} onChange={(e) => setGlitch(Number(e.target.value))} style={{ accentColor: '#FF6B35', width: 120 }} />
          </div>
        </div>
      )}
      {showClip && (
        <div style={{ marginBottom: 10 }}>
          <label style={S.label}>CLIP LENGTH {durationSec}s</label>
          <input type="range" min={2} max={10} value={durationSec} onChange={(e) => setDurationSec(Number(e.target.value))} style={{ accentColor: '#FF6B35', width: 140 }} />
        </div>
      )}
    </>
  )
}

// ─── Forge precise picker (doc 5.2 precise pick) ──────────────────────────────
function ForgePicker({
  taskId, freqs, audioMode, crop, durationSec, settings, busy, setBusy, onResult,
}: {
  taskId: string
  freqs: CosmoFrequency[]
  audioMode: boolean
  crop: { shape: CropShape; areaRatio: number; glitchIntensity: number; filter: FilterPreset }
  durationSec: number
  settings: ReactNode
  busy: boolean
  setBusy: (b: boolean) => void
  onResult: (r: string) => void
}) {
  const [channelId, setChannelId] = useState(freqs[0]?.channelId ?? '')
  const [bandId, setBandId] = useState('')
  const [media, setMedia] = useState<'image' | 'video'>(audioMode ? 'video' : 'image')
  const [assets, setAssets] = useState<{ assetId: string; url: string; posterUrl: string | null; prompt: string | null }[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const freq = freqs.find((f) => f.channelId === channelId)
  const effMedia: 'image' | 'video' = audioMode ? 'video' : media

  const pickFirstBand = (f: CosmoFrequency | undefined) =>
    f?.bands.find((x) => (effMedia === 'image' ? x.imageCount > 0 : x.videoCount > 0))?.bandId || f?.bands[0]?.bandId || ''

  // Reconcile selection once the Cosmo catalog is available (it loads async, so
  // the picker can mount before freqs arrive) and pre-pick a band so Browse is
  // immediately usable.
  useEffect(() => {
    if (!freqs.length) return
    const valid = channelId && freqs.some((f) => f.channelId === channelId) ? channelId : freqs[0].channelId
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reconciles channel/band selection once the async Cosmo catalog arrives
    if (valid !== channelId) setChannelId(valid)
    if (!bandId) {
      const f = freqs.find((x) => x.channelId === valid)
      const b = f?.bands.find((x) => (effMedia === 'image' ? x.imageCount > 0 : x.videoCount > 0))?.bandId || f?.bands[0]?.bandId || ''
      if (b) setBandId(b)
    }
  }, [freqs]) // eslint-disable-line react-hooks/exhaustive-deps

  const browse = async () => {
    if (!channelId || !bandId) return
    setLoading(true); setPicked(new Set())
    setAssets(await listBandAssets(channelId, bandId, effMedia))
    setLoading(false)
  }

  const toggle = (id: string) => setPicked((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })

  const pull = async () => {
    if (!freq || !bandId || picked.size === 0) return
    const band = freq.bands.find((b) => b.bandId === bandId)
    const source = { channelId, channelName: freq.name, freq: freq.freq, bandId, bandName: band?.name || '', media: effMedia }
    setBusy(true); onResult('')

    // Audio + video → browser (ffmpeg.wasm); image → server-side (Vercel can't
    // run the ffmpeg binary). audioMode also forces effMedia=video.
    if (audioMode || effMedia === 'video') {
      const kind: 'video' | 'audio' = audioMode ? 'audio' : 'video'
      const ids = [...picked]
      const byId = new Map(assets.map((a) => [a.assetId, a]))
      let created = 0, skipped = 0
      const errors: string[] = []
      for (let i = 0; i < ids.length; i++) {
        const a = byId.get(ids[i])
        if (!a) continue
        onResult(`Processing ${i + 1}/${ids.length}… (first clip also loads ffmpeg, ~10–20s)`)
        const res = await processAndStoreForgeClip(kind, taskId, source, a, crop, durationSec)
        if (res === 'created') created++
        else if (res === 'skipped') skipped++
        else errors.push(`${a.assetId}: ${res}`)
      }
      setBusy(false)
      setPicked(new Set())
      onResult(`Pulled ${created} candidate(s)` + (skipped ? ` · ${skipped} skipped (no audio)` : '') + (errors.length ? ` · ${errors.length} error(s): ${errors.join(' | ')}` : ''))
      return
    }

    const r = await pullForgeAssets(taskId, source, [...picked], crop, { durationSec })
    setBusy(false)
    setPicked(new Set())
    onResult(`Pulled ${r.created} candidate(s)` + (r.errors.length ? ` · ${r.errors.length} error(s)` : ''))
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <select
          style={{ ...S.sel, maxWidth: 180 }} value={channelId}
          onChange={(e) => { const f = freqs.find((x) => x.channelId === e.target.value); setChannelId(e.target.value); setBandId(pickFirstBand(f)); setAssets([]) }}
        >
          {freqs.map((fr) => <option key={fr.channelId} value={fr.channelId}>{fr.freq != null ? `${fr.freq} · ${fr.name}` : `${fr.name} (unscheduled)`}</option>)}
        </select>
        <select style={{ ...S.sel, maxWidth: 160 }} value={bandId} onChange={(e) => { setBandId(e.target.value); setAssets([]) }}>
          <option value="">— band —</option>
          {(freq?.bands || []).map((b) => <option key={b.bandId} value={b.bandId}>{b.name} ({b.imageCount}i/{b.videoCount}v)</option>)}
        </select>
        {!audioMode && (
          <select style={{ ...S.sel, maxWidth: 80 }} value={media} onChange={(e) => { setMedia(e.target.value as 'image' | 'video'); setAssets([]) }}>
            <option value="image">image</option>
            <option value="video">video</option>
          </select>
        )}
        <button style={{ ...S.btn, ...S.btnGhost }} onClick={browse} disabled={!bandId || loading}>{loading ? 'Loading…' : 'Browse'}</button>
      </div>

      {assets.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 6, marginBottom: 10, maxHeight: 320, overflowY: 'auto', padding: 2 }}>
          {assets.map((a) => {
            const on = picked.has(a.assetId)
            return (
              <div
                key={a.assetId} onClick={() => toggle(a.assetId)} title={a.prompt ?? ''}
                style={{ position: 'relative', cursor: 'pointer', border: on ? '2px solid #20D890' : '1px solid rgba(255,107,53,0.16)', background: '#070912', aspectRatio: '1' }}
              >
                {effMedia === 'video' && !a.posterUrl
                  // no start frame resolved — fall back to a metadata-preloaded <video> (shows a frame, not black)
                  ? <video src={a.url} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  // image, or video with a start-frame poster: show the still frame
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={a.posterUrl ?? a.url} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                {on && <div style={{ position: 'absolute', top: 2, right: 3, color: '#20D890', fontSize: 12 }}>✓</div>}
              </div>
            )
          })}
        </div>
      )}

      {assets.length > 0 && settings}

      <button
        style={{ ...S.btn, ...S.btnOk, opacity: busy || picked.size === 0 ? 0.5 : 1 }}
        disabled={busy || picked.size === 0}
        onClick={pull}
      >{busy ? 'Pulling…' : `⚡ Pull ${picked.size || ''} selected`}</button>
    </>
  )
}

// ─── Asset card ───────────────────────────────────────────────────────────────
function AssetCard({ asset, showRole, onChanged }: { asset: SignalTaskAsset; showRole: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const wrap = async (fn: () => Promise<unknown>) => { setBusy(true); await fn(); await onChanged(); setBusy(false) }

  return (
    <div style={{ border: asset.is_selected ? '2px solid #20D890' : '1px solid rgba(255,107,53,0.16)', background: '#0F1430', padding: 6, opacity: busy ? 0.5 : 1 }}>
      {asset.media === 'video' ? (
        // Video candidates display as an animated WebP/GIF (auto-loops as <img>).
        // Only fall back to a <video> player for legacy mp4-only rows.
        (asset.display_url || /\.(webp|gif)(\?|$)/i.test(asset.processed_url || '')) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.display_url || asset.processed_url || ''} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#070912', display: 'block' }} />
        ) : (
          <video src={asset.processed_url || ''} controls muted loop style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#070912', display: 'block' }} />
        )
      ) : asset.media === 'audio' ? (
        <div style={{ background: '#070912', padding: '14px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 20 }}>🔊</span>
          <audio src={asset.processed_url || ''} controls style={{ width: '100%' }} />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset.processed_url || ''} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#070912', display: 'block' }} />
      )}
      <div style={{ fontSize: 9, color: 'rgba(245,245,245,0.35)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {asset.source_freq ?? '–'} {asset.source_band_name}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
        <button style={{ ...S.btn, padding: '3px 6px', fontSize: '10px', ...(asset.is_selected ? S.btnOk : S.btnGhost) }}
          onClick={() => wrap(() => setAssetSelected(asset.id, !asset.is_selected))}>
          {asset.is_selected ? '✓ Live' : 'Live'}
        </button>
        {showRole && asset.is_selected && (
          <button style={{ ...S.btn, padding: '3px 6px', fontSize: '10px', ...(asset.asset_role === 'main' ? S.btnOk : S.btnGhost) }}
            onClick={() => wrap(() => setAssetRole(asset.id, asset.asset_role === 'main' ? 'option' : 'main'))}>
            {asset.asset_role === 'main' ? '★ Main' : 'Main'}
          </button>
        )}
        <button style={{ ...S.btn, padding: '3px 6px', fontSize: '10px', ...S.btnDanger }}
          onClick={() => wrap(() => deleteAsset(asset.id))}>Del</button>
      </div>
    </div>
  )
}
