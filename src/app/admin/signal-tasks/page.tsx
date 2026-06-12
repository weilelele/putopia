'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getFrequencies,
  listTasks,
  getTask,
  createTask,
  setTaskPublished,
  updateTask,
  deleteTask,
  generateCandidates,
  setAssetSelected,
  setAssetRole,
  deleteAsset,
  listThreads,
  createThread,
} from '@/lib/actions/signal-tasks'
import type {
  SignalTask,
  SignalTaskAsset,
  SignalTaskType,
  GenerateSource,
  SignalThreadRow,
  ThreadSource,
} from '@/lib/actions/signal-tasks'
import type { CosmoFrequency } from '@/lib/cosmo'
import type { CropShape, FilterPreset } from '@/lib/signal/presets'
import { FILTER_PRESETS } from '@/lib/signal/presets'

// ─── styles (match other admin pages) ─────────────────────────────────────────
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
  visual_match: 'VISUAL · Match (main + options)',
  visual_odd_one: 'VISUAL · Odd One Out',
  audio_odd_one: 'AUDIO · Odd One Out',
}

const SHAPES: CropShape[] = ['square', 'circle', 'rect']

const FILTER_LABELS: Record<FilterPreset, string> = {
  signal_decay: 'Signal Decay (pixelate + noise + scanlines)',
  chromatic: 'Chromatic (RGB channel split)',
  glitch_art: 'Glitch Art (slice displacement + ghost)',
  static_noise: 'Static Noise (heavy grain)',
}

export default function SignalTasksAdmin() {
  const [freqs, setFreqs] = useState<CosmoFrequency[]>([])
  const [freqsLoading, setFreqsLoading] = useState(true)
  const [tasks, setTasks] = useState<SignalTask[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const refreshTasks = useCallback(async () => {
    setTasks(await listTasks())
  }, [])

  useEffect(() => {
    getFrequencies().then((f) => {
      setFreqs(f)
      setFreqsLoading(false)
    })
    refreshTasks()
  }, [refreshTasks])

  return (
   <div>
    {!freqsLoading && <ThreadPanel freqs={freqs} />}
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      {/* Left: task list */}
      <div style={{ width: 260, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: '#E85D04', fontSize: 12, letterSpacing: '0.2em' }}>SIGNAL TASKS</span>
          <NewTaskButton onCreated={async (id) => { await refreshTasks(); setActiveId(id) }} />
        </div>
        {tasks.length === 0 && <div style={{ color: 'rgba(245,245,245,0.3)', fontSize: 12 }}>No tasks yet.</div>}
        {tasks.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveId(t.id)}
            style={{
              ...S.card,
              width: '100%', textAlign: 'left', cursor: 'pointer', padding: '12px',
              borderColor: activeId === t.id ? 'rgba(255,107,53,0.5)' : 'rgba(255,107,53,0.16)',
            }}
          >
            <div style={{ fontSize: 11, color: 'rgba(245,245,245,0.35)', letterSpacing: '0.08em' }}>
              {t.task_date} · {t.type.replace(/_/g, ' ')}
            </div>
            <div style={{ fontSize: 12, color: '#F5F5F5', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t.prompt || '(no prompt)'}
            </div>
            <div style={{ fontSize: 10, marginTop: 6, color: t.is_published ? '#20D890' : 'rgba(245,245,245,0.3)', letterSpacing: '0.1em' }}>
              {t.is_published ? '● LIVE' : '○ DRAFT'}
            </div>
          </button>
        ))}
      </div>

      {/* Right: editor */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {freqsLoading && <div style={{ color: 'rgba(245,245,245,0.4)', fontSize: 12, marginBottom: 12 }}>Loading Cosmo catalog…</div>}
        {!activeId ? (
          <div style={{ color: 'rgba(245,245,245,0.3)', fontSize: 13, paddingTop: 40, textAlign: 'center' }}>
            Select a task on the left, or click + NEW to create one.
          </div>
        ) : (
          <TaskEditor
            key={activeId}
            taskId={activeId}
            freqs={freqs}
            onChanged={refreshTasks}
            onDeleted={async () => { setActiveId(null); await refreshTasks() }}
          />
        )}
      </div>
    </div>
   </div>
  )
}

// ─── Investigation threads ─────────────────────────────────────────────────────
function ThreadPanel({ freqs }: { freqs: CosmoFrequency[] }) {
  const [threads, setThreads] = useState<SignalThreadRow[]>([])
  const [open, setOpen] = useState(false)
  const refresh = useCallback(async () => setThreads(await listThreads()), [])
  useEffect(() => { refresh() }, [refresh])

  return (
    <div style={{ ...S.card, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: threads.length || open ? 12 : 0 }}>
        <span style={{ color: '#E85D04', fontSize: 12, letterSpacing: '0.2em' }}>INVESTIGATION THREADS</span>
        <button style={{ ...S.btn, ...S.btnOk }} onClick={() => setOpen((o) => !o)}>{open ? 'Collapse' : '+ New Thread'}</button>
      </div>

      {open && <CreateThreadForm freqs={freqs} onCreated={() => { setOpen(false); refresh() }} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {threads.map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0F1430', border: '1px solid rgba(255,107,53,0.12)', padding: '10px 12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#F5F5F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.title || t.id} <span style={{ color: 'rgba(245,245,245,0.4)' }}>· {t.type.replace(/_/g, ' ')}</span>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(245,245,245,0.4)', marginTop: 3 }}>
                Day {t.day_count} · clarity {t.clarity}/{t.clarity_max} · drift {t.drift} ·{' '}
                <span style={{ color: t.status === 'locked' ? '#20D890' : t.status === 'lost' ? '#E83030' : '#E8A020' }}>
                  {t.status === 'locked' ? `LOCKED${t.world_id ? ` → ${t.world_id}` : ''}` : t.status === 'lost' ? 'LOST' : 'OPEN'}
                </span>
              </div>
            </div>
          </div>
        ))}
        {threads.length === 0 && !open && (
          <div style={{ fontSize: 11, color: 'rgba(245,245,245,0.35)' }}>
            No investigation threads yet. Create one to group daily tasks by signal source.
          </div>
        )}
      </div>
    </div>
  )
}

function CreateThreadForm({ freqs, onCreated }: { freqs: CosmoFrequency[]; onCreated: () => void }) {
  const [type, setType] = useState<SignalTaskType>('visual_odd_one')
  const [prompt, setPrompt] = useState('Which signal does not belong to this group?')
  const [optionCount, setOptionCount] = useState(4)
  const [clarityMax, setClarityMax] = useState(4)
  const [busy, setBusy] = useState(false)
  const audioMode = type === 'audio_odd_one'
  const wantImage = !audioMode
  const pickBand = (f: CosmoFrequency | undefined) =>
    f?.bands.find((b) => (wantImage ? b.imageCount > 0 : b.videoCount > 0)) || f?.bands[0]
  const mk = (f: CosmoFrequency): ThreadSource => { const b = pickBand(f); return { channelId: f.channelId, channelName: f.name, freq: f.freq, bandId: b?.bandId || '', bandName: b?.name || '' } }
  const [group, setGroup] = useState<ThreadSource>(() => mk(freqs[0]))
  const [target, setTarget] = useState<ThreadSource>(() => mk(freqs[1] || freqs[0]))

  const setSrcFreq = (set: (s: ThreadSource) => void, channelId: string) => {
    const f = freqs.find((x) => x.channelId === channelId); if (f) set(mk(f))
  }
  const setSrcBand = (src: ThreadSource, set: (s: ThreadSource) => void, bandId: string) => {
    const f = freqs.find((x) => x.channelId === src.channelId); const b = f?.bands.find((x) => x.bandId === bandId)
    set({ ...src, bandId, bandName: b?.name || '' })
  }
  const srcRow = (label: string, src: ThreadSource, set: (s: ThreadSource) => void) => {
    const f = freqs.find((x) => x.channelId === src.channelId)
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'rgba(245,245,245,0.5)', width: 72 }}>{label}</span>
        <select style={{ ...S.sel, maxWidth: 200 }} value={src.channelId} onChange={(e) => setSrcFreq(set, e.target.value)}>
          {freqs.map((fr) => <option key={fr.channelId} value={fr.channelId}>{fr.freq ?? '–'} {fr.name}</option>)}
        </select>
        <select style={{ ...S.sel, maxWidth: 200 }} value={src.bandId} onChange={(e) => setSrcBand(src, set, e.target.value)}>
          {(f?.bands || []).map((b) => <option key={b.bandId} value={b.bandId}>{b.name} (img {b.imageCount} / vid {b.videoCount})</option>)}
        </select>
      </div>
    )
  }

  const submit = async () => {
    setBusy(true)
    const r = await createThread({ type, prompt, group, target, optionCount, clarityMax })
    setBusy(false)
    if (!r.ok) { alert(r.error || 'Failed to create thread'); return }
    alert(`Thread created. Day 0 task published with ${r.made} assets.`)
    onCreated()
  }

  return (
    <div style={{ background: '#0F1430', border: '1px solid rgba(255,107,53,0.2)', padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <div>
          <label style={S.label}>TYPE</label>
          <select style={S.sel} value={type} onChange={(e) => setType(e.target.value as SignalTaskType)}>
            <option value="visual_odd_one">VISUAL · Odd One Out</option>
            <option value="audio_odd_one">AUDIO · Odd One Out</option>
          </select>
        </div>
        <div>
          <label style={S.label}>OPTIONS</label>
          <input type="number" min={3} max={6} style={{ ...S.input, width: 64 }} value={optionCount} onChange={(e) => setOptionCount(Math.max(3, Number(e.target.value)))} />
        </div>
        <div>
          <label style={S.label}>DAYS TO LOCK</label>
          <input type="number" min={1} max={10} style={{ ...S.input, width: 64 }} value={clarityMax} onChange={(e) => setClarityMax(Math.max(1, Number(e.target.value)))} />
        </div>
      </div>

      <label style={S.label}>PROMPT</label>
      <input style={{ ...S.input, marginBottom: 10 }} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      {srcRow('Group', group, setGroup)}
      {srcRow('Target', target, setTarget)}
      <div style={{ fontSize: 10, color: 'rgba(245,245,245,0.4)', marginBottom: 10 }}>
        Target = the hidden correct answer (the signal that doesn&apos;t belong). Never sent to the frontend.
      </div>
      <button style={{ ...S.btn, ...S.btnOk, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={submit}>
        {busy ? 'Creating…' : 'Create thread & publish day 0'}
      </button>
    </div>
  )
}

// ─── New task ─────────────────────────────────────────────────────────────────
function NewTaskButton({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<SignalTaskType>('visual_odd_one')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)

  if (!open) {
    return <button style={{ ...S.btn, ...S.btnOk }} onClick={() => setOpen(true)}>+ NEW</button>
  }
  return (
    <div style={{ position: 'absolute', zIndex: 10, marginTop: 30, background: '#0F1430', border: '1px solid rgba(255,107,53,0.3)', padding: 14, width: 240 }}>
      <label style={S.label}>TYPE</label>
      <select style={{ ...S.sel, width: '100%' }} value={type} onChange={(e) => setType(e.target.value as SignalTaskType)}>
        {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <label style={{ ...S.label, marginTop: 10 }}>DATE</label>
      <input type="date" style={S.input} value={date} onChange={(e) => setDate(e.target.value)} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        <button style={{ ...S.btn, ...S.btnGhost }} onClick={() => setOpen(false)}>Cancel</button>
        <button
          style={{ ...S.btn, ...S.btnOk, opacity: busy ? 0.5 : 1 }}
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            const r = await createTask({ type, task_date: date })
            setBusy(false)
            if (r.ok && r.id) { setOpen(false); onCreated(r.id) }
            else alert(r.error || 'Failed to create task')
          }}
        >{busy ? '…' : 'Create'}</button>
      </div>
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

  const selectedCount = assets.filter((a) => a.is_selected).length

  return (
    <div>
      {/* meta */}
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: '#E85D04', fontSize: 12, letterSpacing: '0.2em' }}>
            {TYPE_LABELS[task.type]} · {task.task_date}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{ ...S.btn, ...(task.is_published ? S.btnGhost : S.btnOk) }}
              onClick={async () => { await setTaskPublished(taskId, !task.is_published); await reload(); onChanged() }}
            >{task.is_published ? '○ Unpublish' : '● Publish'}</button>
            <button
              style={{ ...S.btn, ...S.btnDanger }}
              onClick={async () => { if (confirm('Delete this task and all its assets?')) { await deleteTask(taskId); onDeleted() } }}
            >Delete</button>
          </div>
        </div>
        <label style={S.label}>PROMPT</label>
        <textarea style={S.area} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Write the puzzle prompt…" />
        <button
          style={{ ...S.btn, ...S.btnGhost, marginTop: 8 }}
          onClick={async () => { await updateTask(taskId, { prompt }); await reload(); onChanged() }}
        >Save</button>
        {task.is_published && selectedCount === 0 && (
          <div style={{ marginTop: 8, fontSize: 11, color: '#E8A020' }}>⚠ Published but no assets selected — members will see nothing.</div>
        )}
      </div>

      {/* generator */}
      <Generator taskId={taskId} freqs={freqs} taskType={task.type} onGenerated={reload} />

      {/* candidate pool */}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
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
function Generator({
  taskId, freqs, taskType, onGenerated,
}: {
  taskId: string
  freqs: CosmoFrequency[]
  taskType: SignalTaskType
  onGenerated: () => void
}) {
  const audioMode = taskType === 'audio_odd_one'
  const [sources, setSources] = useState<GenerateSource[]>([])
  const [shape, setShape] = useState<CropShape>('square')
  const [areaRatio, setAreaRatio] = useState(0.17)
  const [glitch, setGlitch] = useState(50)
  const [filter, setFilter] = useState<FilterPreset>('signal_decay')
  const [durationSec, setDurationSec] = useState(4)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string>('')

  const defaultMedia: 'image' | 'video' = audioMode ? 'video' : 'image'

  const pickBand = (f: CosmoFrequency | undefined, media: 'image' | 'video') =>
    f?.bands.find((x) => (media === 'image' ? x.imageCount > 0 : x.videoCount > 0)) || f?.bands[0]

  const addSource = () => {
    if (sources.length >= 3) return
    const f = freqs[0]
    const b = pickBand(f, defaultMedia)
    if (!f || !b) return
    setSources((s) => [...s, { channelId: f.channelId, channelName: f.name, freq: f.freq, bandId: b.bandId, bandName: b.name, media: defaultMedia, count: 4 }])
  }

  const updateSource = (i: number, patch: Partial<GenerateSource>) =>
    setSources((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)))
  const removeSource = (i: number) => setSources((s) => s.filter((_, idx) => idx !== i))

  const onPickFreq = (i: number, channelId: string) => {
    const f = freqs.find((x) => x.channelId === channelId)
    if (!f) return
    const b = pickBand(f, sources[i].media)
    updateSource(i, { channelId, channelName: f.name, freq: f.freq, bandId: b?.bandId || '', bandName: b?.name || '' })
  }
  const onPickBand = (i: number, bandId: string) => {
    const f = freqs.find((x) => x.channelId === sources[i].channelId)
    const b = f?.bands.find((x) => x.bandId === bandId)
    updateSource(i, { bandId, bandName: b?.name || '' })
  }

  const run = async () => {
    if (sources.length === 0) return
    setBusy(true); setResult('')
    const r = await generateCandidates(taskId, sources, { shape, areaRatio, glitchIntensity: glitch, filter }, { durationSec })
    setBusy(false)
    setResult(`Generated ${r.created} candidates` + (r.errors.length ? ` · ${r.errors.length} error(s): ${r.errors.slice(0, 2).join('; ')}` : ''))
    onGenerated()
  }

  const title = audioMode ? 'BATCH GENERATE (audio from video tracks)' : 'BATCH GENERATE (image / video)'

  return (
    <div style={S.card}>
      <div style={{ color: '#E85D04', fontSize: 12, letterSpacing: '0.2em', marginBottom: 10 }}>{title}</div>
      {audioMode && (
        <div style={{ fontSize: 11, color: 'rgba(245,245,245,0.45)', marginBottom: 10 }}>
          Audio tasks extract the audio track from channel videos. ~25% of clips have no audio (2× oversampling compensates).
        </div>
      )}

      {sources.map((src, i) => {
        const f = freqs.find((x) => x.channelId === src.channelId)
        return (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <select style={{ ...S.sel, maxWidth: 190 }} value={src.channelId} onChange={(e) => onPickFreq(i, e.target.value)}>
              {freqs.map((fr) => <option key={fr.channelId} value={fr.channelId}>{fr.freq ?? '–'} {fr.name}</option>)}
            </select>
            <select style={{ ...S.sel, maxWidth: 190 }} value={src.bandId} onChange={(e) => onPickBand(i, e.target.value)}>
              {(f?.bands || []).map((b) => <option key={b.bandId} value={b.bandId}>{b.name} (img {b.imageCount} / vid {b.videoCount})</option>)}
            </select>
            {!audioMode && (
              <select style={{ ...S.sel, maxWidth: 90 }} value={src.media} onChange={(e) => { const media = e.target.value as 'image' | 'video'; updateSource(i, { media, ...(pickBand(f, media) ? {} : {}) }) }}>
                <option value="image">image</option>
                <option value="video">video</option>
              </select>
            )}
            <label style={{ fontSize: 11, color: 'rgba(245,245,245,0.4)' }}>count</label>
            <input type="number" min={1} max={20} style={{ ...S.input, width: 56 }} value={src.count} onChange={(e) => updateSource(i, { count: Math.max(1, Number(e.target.value)) })} />
            <button style={{ ...S.btn, ...S.btnDanger }} onClick={() => removeSource(i)}>×</button>
          </div>
        )
      })}

      <button style={{ ...S.btn, ...S.btnGhost, marginBottom: 12 }} onClick={addSource} disabled={sources.length >= 3 || freqs.length === 0}>
        + Add source (max 3)
      </button>

      {/* crop / filter config (audio uses none of these) */}
      {!audioMode && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
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
            <label style={S.label}>CROP AREA {(areaRatio * 100).toFixed(0)}%</label>
            <input type="range" min={5} max={40} value={Math.round(areaRatio * 100)} onChange={(e) => setAreaRatio(Number(e.target.value) / 100)} style={{ accentColor: '#FF6B35', width: 140 }} />
          </div>
          <div>
            <label style={S.label}>GLITCH {glitch}</label>
            <input type="range" min={0} max={100} value={glitch} onChange={(e) => setGlitch(Number(e.target.value))} style={{ accentColor: '#FF6B35', width: 140 }} />
          </div>
        </div>
      )}

      {(audioMode || sources.some((s) => s.media === 'video')) && (
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>{audioMode ? 'AUDIO' : 'VIDEO'} CLIP LENGTH {durationSec}s</label>
          <input type="range" min={2} max={10} value={durationSec} onChange={(e) => setDurationSec(Number(e.target.value))} style={{ accentColor: '#FF6B35', width: 160 }} />
        </div>
      )}

      <button style={{ ...S.btn, ...S.btnOk, opacity: busy || sources.length === 0 ? 0.5 : 1 }} disabled={busy || sources.length === 0} onClick={run}>
        {busy ? 'Generating… (this may take a few seconds)' : '⚡ Generate candidates'}
      </button>
      {result && <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(245,245,245,0.6)' }}>{result}</div>}
    </div>
  )
}

// ─── Asset card ───────────────────────────────────────────────────────────────
function AssetCard({
  asset, showRole, onChanged,
}: {
  asset: SignalTaskAsset
  showRole: boolean
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const wrap = async (fn: () => Promise<unknown>) => { setBusy(true); await fn(); await onChanged(); setBusy(false) }

  return (
    <div style={{
      border: asset.is_selected ? '2px solid #20D890' : '1px solid rgba(255,107,53,0.16)',
      background: '#0F1430', padding: 8, opacity: busy ? 0.5 : 1,
    }}>
      {asset.media === 'video' ? (
        <video src={asset.processed_url || ''} controls muted loop style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#070912', display: 'block' }} />
      ) : asset.media === 'audio' ? (
        <div style={{ background: '#070912', padding: '18px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🔊</span>
          <audio src={asset.processed_url || ''} controls style={{ width: '100%' }} />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset.processed_url || ''} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#070912', display: 'block' }} />
      )}
      <div style={{ fontSize: 10, color: 'rgba(245,245,245,0.4)', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {asset.source_freq ?? '–'} {asset.source_channel_name} / {asset.source_band_name}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        <button
          style={{ ...S.btn, padding: '4px 8px', ...(asset.is_selected ? S.btnOk : S.btnGhost) }}
          onClick={() => wrap(() => setAssetSelected(asset.id, !asset.is_selected))}
        >{asset.is_selected ? '✓ Live' : 'Set live'}</button>
        {showRole && asset.is_selected && (
          <button
            style={{ ...S.btn, padding: '4px 8px', ...(asset.asset_role === 'main' ? S.btnOk : S.btnGhost) }}
            onClick={() => wrap(() => setAssetRole(asset.id, asset.asset_role === 'main' ? 'option' : 'main'))}
          >{asset.asset_role === 'main' ? '★ Main' : 'Set main'}</button>
        )}
        <button style={{ ...S.btn, padding: '4px 8px', ...S.btnDanger }} onClick={() => wrap(() => deleteAsset(asset.id))}>Del</button>
      </div>
    </div>
  )
}
