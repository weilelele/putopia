'use client'

import { useEffect, useState, useCallback } from 'react'
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
  createInvestigation,
  addDayToInvestigation,
  listInvestigationTasks,
} from '@/lib/actions/signal-tasks'
import type {
  SignalTask,
  SignalTaskAsset,
  SignalTaskType,
  GenerateSource,
  InvestigationSummary,
} from '@/lib/actions/signal-tasks'
import type { CosmoFrequency } from '@/lib/cosmo'
import type { CropShape, FilterPreset } from '@/lib/signal/presets'
import { FILTER_PRESETS } from '@/lib/signal/presets'

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
              {inv.type.replace(/_/g, ' ')} · {inv.dayCount} day{inv.dayCount !== 1 ? 's' : ''}
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

// ─── New investigation form ────────────────────────────────────────────────────
function NewInvestigationForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<SignalTaskType>('visual_odd_one')
  const [busy, setBusy] = useState(false)

  return (
    <div style={{ ...S.card, padding: 12, marginBottom: 12 }}>
      <label style={S.label}>TITLE</label>
      <input style={{ ...S.input, marginBottom: 8 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Alien Signal" />
      <label style={S.label}>TYPE</label>
      <select style={{ ...S.sel, width: '100%', marginBottom: 10 }} value={type} onChange={(e) => setType(e.target.value as SignalTaskType)}>
        {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <button
        style={{ ...S.btn, ...S.btnOk, opacity: !title.trim() || busy ? 0.5 : 1, width: '100%' }}
        disabled={!title.trim() || busy}
        onClick={async () => {
          setBusy(true)
          const r = await createInvestigation({ title: title.trim(), type })
          setBusy(false)
          if (!r.ok || !r.id) { alert(r.error || 'Failed'); return }
          onCreated(r.id)
        }}
      >{busy ? 'Creating…' : 'Create'}</button>
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
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    setTasks(await listInvestigationTasks(investigationId))
  }, [investigationId])

  useEffect(() => { reload() }, [reload])

  const addDay = async () => {
    setBusy(true)
    const r = await addDayToInvestigation(investigationId)
    setBusy(false)
    if (!r.ok || !r.id) { alert(r.error || 'Failed'); return }
    await reload()
    onDayAdded(r.id)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ color: '#E85D04', fontSize: 11, letterSpacing: '0.15em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
          {investigationTitle || 'DAYS'}
        </span>
        <button
          style={{ ...S.btn, ...S.btnGhost, padding: '3px 8px', opacity: busy ? 0.5 : 1 }}
          disabled={busy}
          onClick={addDay}
        >{busy ? '…' : '+ Day'}</button>
      </div>

      {tasks.length === 0 && (
        <div style={{ fontSize: 11, color: 'rgba(245,245,245,0.3)' }}>No days yet — click + Day.</div>
      )}

      {tasks.map((t) => {
        const dayNum = (t.day_index ?? 0) + 1
        const isActive = t.id === activeTaskId
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
            <div style={{ fontSize: 10, color: 'rgba(245,245,245,0.35)', marginTop: 2 }}>
              {t.task_date} · <span style={{ color: t.is_published ? '#20D890' : 'rgba(245,245,245,0.3)' }}>{t.is_published ? '● LIVE' : '○ DRAFT'}</span>
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
            DAY {dayNum} · {task.task_date} · {TYPE_LABELS[task.type]}
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
        <label style={S.label}>PROMPT</label>
        <textarea style={S.area} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Write the puzzle prompt…" />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button
            style={{ ...S.btn, ...S.btnGhost }}
            onClick={async () => { await updateTask(taskId, { prompt }); await reload(); onChanged() }}
          >Save prompt</button>
          <div>
            <label style={{ ...S.label, display: 'inline', marginRight: 6 }}>Date</label>
            <input
              type="date" style={{ ...S.input, width: 140, display: 'inline-block' }}
              value={task.task_date}
              onChange={async (e) => { await updateTask(taskId, { task_date: e.target.value }); await reload(); onChanged() }}
            />
          </div>
        </div>
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
              <AssetCard key={a.id} asset={a} showRole={task.type === 'visual_match'} onChanged={reload} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Generator ────────────────────────────────────────────────────────────────
function Generator({ taskId, freqs, taskType, onGenerated }: { taskId: string; freqs: CosmoFrequency[]; taskType: SignalTaskType; onGenerated: () => void }) {
  const audioMode = taskType === 'audio_odd_one'
  const [sources, setSources] = useState<GenerateSource[]>([])
  const [shape, setShape] = useState<CropShape>('square')
  const [areaRatio, setAreaRatio] = useState(0.17)
  const [glitch, setGlitch] = useState(50)
  const [filter, setFilter] = useState<FilterPreset>('signal_decay')
  const [durationSec, setDurationSec] = useState(4)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')

  const defaultMedia: 'image' | 'video' = audioMode ? 'video' : 'image'
  const pickBand = (f: CosmoFrequency | undefined, media: 'image' | 'video') =>
    f?.bands.find((x) => (media === 'image' ? x.imageCount > 0 : x.videoCount > 0)) || f?.bands[0]

  const addSource = () => {
    if (sources.length >= 3 || !freqs[0]) return
    const f = freqs[0]; const b = pickBand(f, defaultMedia)
    if (!b) return
    setSources((s) => [...s, { channelId: f.channelId, channelName: f.name, freq: f.freq, bandId: b.bandId, bandName: b.name, media: defaultMedia, count: 4 }])
  }
  const updateSource = (i: number, patch: Partial<GenerateSource>) => setSources((s) => s.map((x, idx) => idx === i ? { ...x, ...patch } : x))
  const removeSource = (i: number) => setSources((s) => s.filter((_, idx) => idx !== i))
  const onPickFreq = (i: number, channelId: string) => {
    const f = freqs.find((x) => x.channelId === channelId); if (!f) return
    const b = pickBand(f, sources[i].media)
    updateSource(i, { channelId, channelName: f.name, freq: f.freq, bandId: b?.bandId || '', bandName: b?.name || '' })
  }
  const onPickBand = (i: number, bandId: string) => {
    const f = freqs.find((x) => x.channelId === sources[i].channelId)
    const b = f?.bands.find((x) => x.bandId === bandId)
    updateSource(i, { bandId, bandName: b?.name || '' })
  }
  const run = async () => {
    if (!sources.length) return
    setBusy(true); setResult('')
    const r = await generateCandidates(taskId, sources, { shape, areaRatio, glitchIntensity: glitch, filter }, { durationSec })
    setBusy(false)
    setResult(`Generated ${r.created} candidates` + (r.errors.length ? ` · ${r.errors.length} error(s)` : ''))
    onGenerated()
  }

  return (
    <div style={S.card}>
      <div style={{ color: '#E85D04', fontSize: 12, letterSpacing: '0.2em', marginBottom: 10 }}>
        {audioMode ? 'BATCH GENERATE (audio from video)' : 'BATCH GENERATE'}
      </div>

      {sources.map((src, i) => {
        const f = freqs.find((x) => x.channelId === src.channelId)
        return (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <select style={{ ...S.sel, maxWidth: 180 }} value={src.channelId} onChange={(e) => onPickFreq(i, e.target.value)}>
              {freqs.map((fr) => <option key={fr.channelId} value={fr.channelId}>{fr.freq ?? '–'} {fr.name}</option>)}
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

      {(audioMode || sources.some((s) => s.media === 'video')) && (
        <div style={{ marginBottom: 10 }}>
          <label style={S.label}>CLIP LENGTH {durationSec}s</label>
          <input type="range" min={2} max={10} value={durationSec} onChange={(e) => setDurationSec(Number(e.target.value))} style={{ accentColor: '#FF6B35', width: 140 }} />
        </div>
      )}

      <button style={{ ...S.btn, ...S.btnOk, opacity: busy || !sources.length ? 0.5 : 1 }} disabled={busy || !sources.length} onClick={run}>
        {busy ? 'Generating…' : '⚡ Generate candidates'}
      </button>
      {result && <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(245,245,245,0.6)' }}>{result}</div>}
    </div>
  )
}

// ─── Asset card ───────────────────────────────────────────────────────────────
function AssetCard({ asset, showRole, onChanged }: { asset: SignalTaskAsset; showRole: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const wrap = async (fn: () => Promise<unknown>) => { setBusy(true); await fn(); await onChanged(); setBusy(false) }

  return (
    <div style={{ border: asset.is_selected ? '2px solid #20D890' : '1px solid rgba(255,107,53,0.16)', background: '#0F1430', padding: 6, opacity: busy ? 0.5 : 1 }}>
      {asset.media === 'video' ? (
        <video src={asset.processed_url || ''} controls muted loop style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#070912', display: 'block' }} />
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
