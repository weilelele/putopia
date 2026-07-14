'use client'

import { useEffect, useRef, useState } from 'react'
import {
  getOnboardingVariants,
  updateOnboardingVariant,
  createOnboardingVariant,
  deleteOnboardingVariant,
  createOnboardingVideoUploadUrl,
} from '@/lib/actions/onboarding-variants'
import { FALLBACK_COPY } from '@/lib/onboarding-variants'
import { createClient } from '@/lib/supabase/client'
import type { OnboardingVariantRow } from '@/types/database'

/* Max video size — mirrors the `onboarding` bucket's file_size_limit (schema_v45). */
const MAX_VIDEO_BYTES = 50 * 1024 * 1024

/* The three per-step video slots. `col` is the DB column; a step left null
   inherits the previous step (see resolver's chainVideos). */
const VIDEO_STEPS: { col: 'video_url' | 'video_url_q2' | 'video_url_cta'; label: string; inherit: string }[] = [
  { col: 'video_url',     label: 'Q1 视频',  inherit: '继承 DEFAULT' },
  { col: 'video_url_q2',  label: 'Q2 视频',  inherit: '继承 Q1' },
  { col: 'video_url_cta', label: 'CTA 视频', inherit: '继承 Q2' },
]

const STEPS = [
  { id: 'q1',  label: 'Q1 · 观测仪好奇' },
  { id: 'q2',  label: 'Q2 · 选择世界' },
  { id: 'q3',  label: 'Q3 · 迫切度滑块' },
  { id: 'cta', label: 'CTA · 邮箱表单' },
] as const
type StepId = typeof STEPS[number]['id']

/* Editable text fields: db column → label, multiline, fallback (for placeholder).
   Ordered to match the live flow. NOTE: q1_headline is the legacy column that
   now drives the Q3 urgency slider; q2_headline drives Q2 (world choice). */
const FIELDS: { col: keyof OnboardingVariantRow; label: string; multiline: boolean; fallback: string }[] = [
  { col: 'console_headline', label: 'Q1 问题 · 观测仪', multiline: true,  fallback: FALLBACK_COPY.consoleHeadline },
  { col: 'q2_headline',    label: 'Q2 问题 · 选择世界', multiline: true,  fallback: FALLBACK_COPY.q2Headline },
  { col: 'q1_headline',    label: 'Q3 问题 · 迫切度',  multiline: true,  fallback: FALLBACK_COPY.q1Headline },
  { col: 'affirm_line1',   label: 'CTA 肯定句 1',  multiline: true,  fallback: FALLBACK_COPY.affirmLine1 },
  { col: 'affirm_line2',   label: 'CTA 肯定句 2',  multiline: true,  fallback: FALLBACK_COPY.affirmLine2 },
  { col: 'cta_invitation', label: 'CTA 邀请语',    multiline: true,  fallback: FALLBACK_COPY.ctaInvitation },
  { col: 'cta_label',      label: 'CTA 按钮文案',  multiline: false, fallback: FALLBACK_COPY.ctaLabel },
]

const ORANGE = '#FF6B35'
const BORDER = 'rgba(255,107,53,0.16)'
const PANEL  = '#0F1430'
const MUTED  = 'rgba(245,245,245,0.55)'
const FAINT  = 'rgba(245,245,245,0.35)'

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0A0E27', color: '#F5F5F5',
  border: `1px solid ${BORDER}`, padding: '8px 10px',
  fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, resize: 'vertical',
}

export default function OnboardingEditorPage() {
  const [variants, setVariants] = useState<OnboardingVariantRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<string | null>(null)   // row id currently saving
  const [step, setStep]         = useState<StepId>('q1')
  const [device, setDevice]     = useState<'mobile' | 'desktop'>('mobile')
  const [nonces, setNonces]     = useState<Record<string, number>>({})  // per-row iframe reload
  const [error, setError]       = useState<string | null>(null)

  const frameW = device === 'mobile' ? 380 : 520
  const frameH = device === 'mobile' ? 720 : 680

  useEffect(() => {
    getOnboardingVariants().then(rows => { setVariants(rows); setLoading(false) })
  }, [])

  const defaultRow = variants.find(v => v.match_key === '')

  const reloadFrame = (id: string) => setNonces(n => ({ ...n, [id]: (n[id] ?? 0) + 1 }))
  const reloadAll   = () => setNonces(n => { const m = { ...n }; variants.forEach(v => m[v.id] = (m[v.id] ?? 0) + 1); return m })

  /* Update one field locally (controlled input) */
  const setField = (id: string, col: keyof OnboardingVariantRow, value: string | boolean) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [col]: value } : v))
  }

  /* Persist one field on blur. Empty text on a variant row → null (inherit default). */
  const saveField = async (row: OnboardingVariantRow, col: keyof OnboardingVariantRow) => {
    setSaving(row.id)
    let value = row[col] as string | boolean | null
    if (typeof value === 'string' && value.trim() === '') value = null
    const res = await updateOnboardingVariant(row.id, { [col]: value })
    setSaving(null)
    if (res.error) { setError(res.error); return }
    reloadFrame(row.id)
  }

  const saveToggle = async (row: OnboardingVariantRow, enabled: boolean) => {
    setField(row.id, 'enabled', enabled)
    setSaving(row.id)
    await updateOnboardingVariant(row.id, { enabled })
    setSaving(null)
    reloadFrame(row.id)
  }

  type VideoCol = (typeof VIDEO_STEPS)[number]['col']

  const handleUpload = async (row: OnboardingVariantRow, col: VideoCol, file: File) => {
    setError(null)
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`视频 ${(file.size / 1024 / 1024).toFixed(1)}MB 超过 50MB 上限`)
      return
    }
    setSaving(row.id)
    // Upload straight to Supabase Storage via a signed URL (no server-action body cap).
    const ext = file.name.split('.').pop() ?? 'mp4'
    const signed = await createOnboardingVideoUploadUrl(ext)
    if (signed.error || !signed.path || !signed.token || !signed.publicUrl) {
      setError(signed.error ?? '获取上传地址失败'); setSaving(null); return
    }
    const { error: upErr } = await createClient().storage
      .from('onboarding')
      .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type || undefined })
    if (upErr) { setError(upErr.message); setSaving(null); return }

    const res = await updateOnboardingVariant(row.id, { [col]: signed.publicUrl })
    if (res.error) { setError(res.error); setSaving(null); return }
    setField(row.id, col, signed.publicUrl)
    setSaving(null)
    reloadFrame(row.id)
  }

  /* Clear one step's own video → it falls back to inheriting the previous step. */
  const clearVideo = async (row: OnboardingVariantRow, col: VideoCol) => {
    setSaving(row.id)
    setField(row.id, col, null as never)
    const res = await updateOnboardingVariant(row.id, { [col]: null })
    setSaving(null)
    if (res.error) { setError(res.error); return }
    reloadFrame(row.id)
  }

  /* Effective per-step video for display: own value → DEFAULT's value → previous
     step → fallback reel. Mirrors the resolver's two inheritance axes. */
  const videoChainFor = (row: OnboardingVariantRow) => {
    const q1  = row.video_url     ?? defaultRow?.video_url     ?? FALLBACK_COPY.videoQ1
    const q2  = row.video_url_q2  ?? defaultRow?.video_url_q2  ?? q1
    const cta = row.video_url_cta ?? defaultRow?.video_url_cta ?? q2
    return { video_url: q1, video_url_q2: q2, video_url_cta: cta }
  }

  const handleAdd = async () => {
    const key = prompt('新分组的 utm_content 值（如 A2）：')?.trim()
    if (!key) return
    const matchKey = key.toLowerCase()
    if (variants.some(v => v.match_key === matchKey)) { setError(`已存在 ${matchKey}`); return }
    const maxOrder = variants.reduce((m, v) => Math.max(m, v.sort_order), 0)
    const res = await createOnboardingVariant({ match_key: matchKey, label: key.toUpperCase(), sort_order: maxOrder + 1 })
    if (res.error || !res.data) { setError(res.error ?? '创建失败'); return }
    setVariants(prev => [...prev, res.data!])
  }

  const handleDelete = async (row: OnboardingVariantRow) => {
    if (!confirm(`删除变体 ${row.label}（utm_content=${row.match_key}）？`)) return
    setVariants(prev => prev.filter(v => v.id !== row.id))
    await deleteOnboardingVariant(row.id)
  }

  const srcFor = (matchKey: string, id: string) => {
    const sp = new URLSearchParams()
    if (matchKey) sp.set('variant', matchKey)
    sp.set('preview', '1')
    sp.set('step', step)
    sp.set('_n', String(nonces[id] ?? 0))   // cache-bust on reload
    return `/new?${sp.toString()}`
  }

  if (loading) return <div style={{ fontFamily: 'monospace', color: MUTED, fontSize: 12 }}>加载中…</div>

  return (
    <div style={{ fontFamily: 'monospace', color: '#F5F5F5' }}>

      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 15, letterSpacing: '0.18em', color: ORANGE, margin: '0 0 6px' }}>
          ONBOARDING · UTM 变体编辑器
        </h1>
        <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.7, margin: 0, maxWidth: 820 }}>
          按 <code style={{ color: '#F5F5F5' }}>utm_content</code> 区分广告组的 onboarding 文案与视频，直接在此编辑、上传，改完即时生效（右侧预览实时渲染真实流程）。
          <b style={{ color: '#F5F5F5' }}> DEFAULT</b> 是基准；其它变体留空的字段会自动继承 DEFAULT（占位符即继承值）。
        </p>
      </div>

      {/* Global controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
        <Toggle label="预览步骤" value={step} options={STEPS.map(s => ({ v: s.id, t: s.label }))} onChange={v => { setStep(v as StepId); reloadAll() }} />
        <Toggle label="尺寸" value={device} options={[{ v: 'mobile', t: 'MOBILE' }, { v: 'desktop', t: 'DESKTOP' }]} onChange={v => setDevice(v as 'mobile' | 'desktop')} />
        <button onClick={reloadAll} style={btnStyle}>↻ 全部重载</button>
        <button onClick={handleAdd} style={{ ...btnStyle, color: ORANGE, borderColor: 'rgba(255,107,53,0.4)' }}>+ 新增变体</button>
        {saving && <span style={{ fontSize: 11, color: ORANGE }}>保存中…</span>}
        {error && <span style={{ fontSize: 11, color: '#E83030' }}>{error}</span>}
      </div>

      {/* Variant editors */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {variants.map(row => {
          const isDefault = row.match_key === ''
          const videoChain = videoChainFor(row)
          return (
            <div key={row.id} style={{ border: `1px solid ${BORDER}`, background: PANEL }}>

              {/* Card header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 14, letterSpacing: '0.16em', color: ORANGE }}>
                  {isDefault ? 'DEFAULT' : row.label}
                </span>
                <code style={{ fontSize: 11, color: FAINT }}>
                  {isDefault ? '基准 / 不命中时' : `utm_content = ${row.match_key}`}
                </code>
                {!isDefault && (
                  <label style={{ fontSize: 11, color: MUTED, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={row.enabled} onChange={e => saveToggle(row, e.target.checked)} />
                    启用
                  </label>
                )}
                <a href={srcFor(row.match_key, row.id)} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontSize: 11, color: MUTED, textDecoration: 'none' }}>
                  新标签打开 ↗
                </a>
                {!isDefault && (
                  <button onClick={() => handleDelete(row)} style={{ ...btnStyle, color: '#E83030', borderColor: 'rgba(232,48,48,0.4)', padding: '4px 10px' }}>删除</button>
                )}
              </div>

              {/* Body: form (left) + live preview (right) */}
              <div style={{ display: 'flex', gap: 20, padding: 16, flexWrap: 'wrap' }}>

                {/* Edit form */}
                <div style={{ flex: '1 1 360px', minWidth: 320, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {FIELDS.map(f => {
                    const val = (row[f.col] as string | null) ?? ''
                    const placeholder = isDefault ? f.fallback : `（继承 DEFAULT）${(defaultRow?.[f.col] as string | null) || f.fallback}`
                    return (
                      <div key={String(f.col)} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 10, letterSpacing: '0.16em', color: FAINT }}>{f.label}</label>
                        {f.multiline ? (
                          <textarea
                            rows={2}
                            value={val}
                            placeholder={placeholder}
                            onChange={e => setField(row.id, f.col, e.target.value)}
                            onBlur={() => saveField(row, f.col)}
                            style={inputStyle}
                          />
                        ) : (
                          <input
                            type="text"
                            value={val}
                            placeholder={placeholder}
                            onChange={e => setField(row.id, f.col, e.target.value)}
                            onBlur={() => saveField(row, f.col)}
                            style={inputStyle}
                          />
                        )}
                      </div>
                    )
                  })}

                  {/* Per-step videos — each step uploads independently or inherits the previous */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {VIDEO_STEPS.map(s => {
                      const own = row[s.col] as string | null
                      // Q1 on DEFAULT can only inherit the bundled reel; label it plainly.
                      const inheritLabel = s.col === 'video_url' && isDefault ? '默认内置' : s.inherit
                      return (
                        <div key={s.col} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ fontSize: 10, letterSpacing: '0.16em', color: FAINT }}>
                            {s.label} {own ? '（自定义）' : `（${inheritLabel}）`}
                          </label>
                          <code style={{ fontSize: 10, color: own ? MUTED : FAINT, wordBreak: 'break-all' }}>
                            {videoChain[s.col]}
                          </code>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <VideoUpload onPick={file => handleUpload(row, s.col, file)} />
                            {own && (
                              <button
                                onClick={() => clearVideo(row, s.col)}
                                style={{ ...btnStyle, padding: '4px 10px' }}
                              >
                                恢复{inheritLabel}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Live preview */}
                <div style={{ flex: '0 0 auto' }}>
                  <div style={{ fontSize: 10, color: FAINT, marginBottom: 6 }}>实时预览 · {step.toUpperCase()}</div>
                  <div style={{ width: frameW, height: frameH, border: `1px solid ${BORDER}`, background: '#0A0E27', overflow: 'hidden' }}>
                    <iframe
                      key={`${row.id}-${step}-${nonces[row.id] ?? 0}`}
                      src={srcFor(row.match_key, row.id)}
                      title={row.label}
                      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                    />
                  </div>
                </div>

              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Small UI helpers ── */
const btnStyle: React.CSSProperties = {
  padding: '8px 14px', fontSize: 11, letterSpacing: '0.1em',
  fontFamily: 'monospace', cursor: 'pointer',
  background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`,
}

function Toggle({ label, value, options, onChange }: {
  label: string; value: string; options: { v: string; t: string }[]; onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, letterSpacing: '0.2em', color: FAINT }}>{label}</span>
      <div style={{ display: 'flex', border: `1px solid ${BORDER}` }}>
        {options.map((o, i) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            style={{
              padding: '8px 14px', fontSize: 11, letterSpacing: '0.1em', fontFamily: 'monospace', cursor: 'pointer',
              background: value === o.v ? 'rgba(255,107,53,0.14)' : 'transparent',
              color: value === o.v ? '#F5F5F5' : MUTED,
              border: 'none', borderRight: i < options.length - 1 ? `1px solid ${BORDER}` : 'none',
            }}
          >
            {o.t}
          </button>
        ))}
      </div>
    </div>
  )
}

function VideoUpload({ onPick }: { onPick: (file: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); if (ref.current) ref.current.value = '' }}
      />
      <button onClick={() => ref.current?.click()} style={{ ...btnStyle, alignSelf: 'flex-start' }}>
        ↑ 上传新视频
      </button>
    </>
  )
}
