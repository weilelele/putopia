'use client'

import { useState, useEffect, useRef } from 'react'
import {
  getAllIntel, createIntel, updateIntel, deleteIntel,
} from '@/lib/actions/intel'
import { generateAndSaveFeed, getLatestFeed } from '@/lib/actions/dashboard-feed'
import { createClient } from '@/lib/supabase/client'
import type { Intel, IntelTag } from '@/types/database'
import { MemberPicker, type MemberValue } from '@/components/member-picker'

const S = {
  card:  { background: '#151B3A', border: '1px solid rgba(227,82,5,0.16)', padding: '20px', marginBottom: '16px' },
  th:    { textAlign: 'left' as const, padding: '8px 12px', color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', borderBottom: '1px solid rgba(227,82,5,0.16)', whiteSpace: 'nowrap' as const },
  td:    { padding: '8px 12px', color: 'rgba(245,245,245,0.55)', borderBottom: '1px solid #0F1430', verticalAlign: 'top' as const, fontSize: '13px' },
  label: { display: 'block', color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', marginBottom: '4px' } as const,
  input: { width: '100%', background: '#0F1430', border: '1px solid rgba(227,82,5,0.16)', color: '#F5F5F5', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const },
  area:  { width: '100%', background: '#0F1430', border: '1px solid rgba(227,82,5,0.16)', color: '#F5F5F5', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const },
  sel:   { width: '100%', background: '#0F1430', border: '1px solid rgba(227,82,5,0.16)', color: '#F5F5F5', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none' },
}

const TAG_COLOR: Record<IntelTag, string> = { NOTICE: 'rgba(245,245,245,0.55)', DEVICE: '#C84406', ORG: '#E8A020' }

type F = {
  id: string
  title: string
  content: string
  timestamp: string
  tag: IntelTag
  classified: boolean
  publisher_name: string
  publisher_id: string | null
}

const EMPTY: F = {
  id: '', title: '', content: '',
  timestamp: new Date().toISOString().slice(0, 16),
  tag: 'NOTICE', classified: false,
  publisher_name: '', publisher_id: null,
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function nextIntelId(items: Intel[]) {
  const nums = items.map(i => parseInt(i.id.replace('INT-', ''))).filter(n => !isNaN(n))
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `INT-${String(next).padStart(3, '0')}`
}

export default function IntelAdmin() {
  const [items, setItems]           = useState<Intel[]>([])
  const [loading, setLoading]       = useState(true)
  const [form, setForm]             = useState<F>(EMPTY)
  const [editId, setEditId]         = useState<string | null>(null)
  const [showForm, setShowForm]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState<{ text: string; ok: boolean } | null>(null)
  const [currentImages, setCurrentImages] = useState<string[]>([])
  const [pendingFiles, setPendingFiles]   = useState<File[]>([])
  const [previews, setPreviews]           = useState<string[]>([])
  const [uploading, setUploading]         = useState(false)
  const [defaultPublisher, setDefaultPublisher] = useState('')
  const [feedGenerating, setFeedGenerating] = useState(false)
  const [feedMsg, setFeedMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [feedLastGenerated, setFeedLastGenerated] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const load = async () => { setLoading(true); setItems(await getAllIntel()); setLoading(false) }
  useEffect(() => {
    let active = true
    getAllIntel().then(items => { if (active) { setItems(items); setLoading(false) } })
    getLatestFeed().then(f => { if (active && f?.generated_at) setFeedLastGenerated(f.generated_at) })
    return () => { active = false }
  }, [])

  // Fetch current user display name for publisher default
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('voyager_profiles').select('display_name').eq('id', user.id).single()
        .then(({ data }) => { if (data) setDefaultPublisher(data.display_name) })
    })
  }, [])

  const resetImageState = () => {
    setPendingFiles([])
    setPreviews([])
    setCurrentImages([])
  }

  const openNew = () => {
    setForm({ ...EMPTY, id: '', publisher_name: defaultPublisher })
    setEditId(null)
    resetImageState()
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const openEdit = (i: Intel) => {
    setForm({
      id: i.id, title: i.title, content: i.content,
      timestamp: i.timestamp.slice(0, 16), tag: i.tag, classified: i.classified,
      publisher_name: i.publisher_name ?? defaultPublisher,
      publisher_id: i.publisher_id ?? null,
    })
    setCurrentImages(i.images ?? [])
    setPendingFiles([])
    setPreviews([])
    setEditId(i.id)
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const set = (k: keyof F, v: string | boolean | null) => setForm(f => ({ ...f, [k]: v }))
  const setPublisher = (v: MemberValue) => setForm(f => ({ ...f, publisher_id: v?.id ?? null, publisher_name: v?.name ?? '' }))

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setPendingFiles(prev => [...prev, ...files])
    const newPreviews = files.map(f => URL.createObjectURL(f))
    setPreviews(prev => [...prev, ...newPreviews])
    e.target.value = ''
  }

  const removePending = (idx: number) => {
    URL.revokeObjectURL(previews[idx])
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const removeExisting = (url: string) => {
    setCurrentImages(prev => prev.filter(u => u !== url))
  }

  const uploadPendingFiles = async (intelId: string): Promise<string[]> => {
    const supabase = createClient()
    const urls: string[] = []
    for (const file of pendingFiles) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${intelId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('intel-images').upload(path, file)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('intel-images').getPublicUrl(path)
        urls.push(publicUrl)
      }
    }
    return urls
  }

  const handleSave = async () => {
    const id = form.id.trim() || nextIntelId(items)
    if (!form.title.trim()) { setMsg({ text: '标题不能为空', ok: false }); return }
    setSaving(true); setUploading(true); setMsg(null)

    const newUrls = await uploadPendingFiles(id)
    setUploading(false)
    const allImages = [...currentImages, ...newUrls]

    const payload = {
      id,
      title: form.title.trim(),
      content: form.content.trim(),
      timestamp: new Date(form.timestamp).toISOString(),
      tag: form.tag,
      classified: form.classified,
      images: allImages,
      publisher_name: form.publisher_name.trim() || null,
      publisher_id: form.publisher_id,
      created_by: null,
    }
    const result = editId ? await updateIntel(editId, payload) : await createIntel(payload)
    setSaving(false)
    if (result?.error) { setMsg({ text: result.error, ok: false }); return }
    setMsg({ text: '保存成功 ✓', ok: true })
    setShowForm(false)
    resetImageState()
    await load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(`删除情报 "${id}"？`)) return
    await deleteIntel(id); await load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.3em' }}>ADMIN // INTEL</div>
          <div style={{ color: '#F5F5F5', fontSize: '20px', fontWeight: 'bold', marginTop: '2px' }}>情报管理</div>
        </div>
        <button onClick={openNew} style={{ padding: '8px 18px', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.15em', cursor: 'pointer', border: '1px solid #C84406', color: '#C84406', background: 'rgba(200,68,6,0.08)' }}>
          + 新增情报
        </button>
      </div>

      {msg && (
        <div style={{ marginBottom: '12px', padding: '8px 12px', background: msg.ok ? 'rgba(32,216,144,0.1)' : 'rgba(232,48,48,0.1)', border: `1px solid ${msg.ok ? '#20D890' : '#E83030'}`, color: msg.ok ? '#20D890' : '#E83030', fontSize: '13px' }}>
          {msg.text}
        </div>
      )}

      <div style={S.card}>
        {loading ? <div style={{ color: 'rgba(245,245,245,0.35)', padding: '20px', textAlign: 'center' }}>加载中...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={S.th}>ID</th>
                <th style={S.th}>标题</th>
                <th style={S.th}>类型</th>
                <th style={S.th}>级别</th>
                <th style={S.th}>图片</th>
                <th style={S.th}>发布者</th>
                <th style={S.th}>时间</th>
                <th style={S.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={8} style={{ ...S.td, textAlign: 'center', color: 'rgba(245,245,245,0.35)' }}>暂无数据</td></tr>}
              {items.map(i => (
                <tr key={i.id}>
                  <td style={{ ...S.td, color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)' }}>{i.id}</td>
                  <td style={{ ...S.td, color: '#F5F5F5', maxWidth: '240px' }}>{i.title}</td>
                  <td style={S.td}><span style={{ fontSize: 'var(--fs-caption)', color: TAG_COLOR[i.tag] }}>{i.tag}</span></td>
                  <td style={S.td}>
                    {i.classified
                      ? <span style={{ fontSize: 'var(--fs-caption)', color: '#E83030' }}>⊘ 机密</span>
                      : <span style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)' }}>公开</span>}
                  </td>
                  <td style={S.td}>
                    <span style={{ fontSize: 'var(--fs-caption)', color: (i.images?.length ?? 0) > 0 ? '#20D890' : 'rgba(245,245,245,0.35)' }}>
                      {(i.images?.length ?? 0) > 0 ? `${i.images.length} 张` : '—'}
                    </span>
                  </td>
                  <td style={{ ...S.td, fontSize: 'var(--fs-caption)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i.publisher_name ?? <span style={{ color: 'rgba(245,245,245,0.35)' }}>—</span>}
                  </td>
                  <td style={{ ...S.td, fontSize: 'var(--fs-caption)', whiteSpace: 'nowrap' }}>{formatTs(i.timestamp)}</td>
                  <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => openEdit(i)} style={{ marginRight: '8px', background: 'none', border: 'none', color: '#C84406', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}>编辑</button>
                    <button onClick={() => handleDelete(i.id)} style={{ background: 'none', border: 'none', color: '#E83030', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div ref={formRef} style={{ ...S.card, border: '1px solid #C84406' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ color: '#C84406', fontSize: '12px', letterSpacing: '0.2em' }}>{editId ? `编辑: ${editId}` : `新增情报 (自动 ID: ${nextIntelId(items)})`}</div>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'rgba(245,245,245,0.35)', cursor: 'pointer', fontSize: '18px' }}>×</button>
          </div>

          {/* Row 1: ID / Tag / Timestamp */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={S.label}>ID（留空则自动生成）</label>
              <input style={S.input} value={form.id} onChange={e => set('id', e.target.value)} placeholder={nextIntelId(items)} disabled={!!editId} />
            </div>
            <div>
              <label style={S.label}>类型</label>
              <select style={S.sel} value={form.tag} onChange={e => set('tag', e.target.value as IntelTag)}>
                <option value="NOTICE">NOTICE — 通知</option>
                <option value="DEVICE">DEVICE — 设备</option>
                <option value="ORG">ORG — 组织</option>
              </select>
            </div>
            <div>
              <label style={S.label}>时间戳</label>
              <input style={S.input} type="datetime-local" value={form.timestamp} onChange={e => set('timestamp', e.target.value)} />
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '12px' }}>
            <label style={S.label}>标题 *</label>
            <input style={S.input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="情报标题" />
          </div>

          {/* Content */}
          <div style={{ marginBottom: '12px' }}>
            <label style={S.label}>正文内容</label>
            <textarea style={{ ...S.area, minHeight: '120px' }} value={form.content} onChange={e => set('content', e.target.value)} placeholder="情报详细内容..." />
          </div>

          {/* Publisher */}
          <div style={{ marginBottom: '16px' }}>
            <MemberPicker
              label="发布者"
              value={form.publisher_id ? { id: form.publisher_id, name: form.publisher_name } : null}
              onChange={setPublisher}
            />
          </div>

          {/* Image upload */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ ...S.label, marginBottom: '8px' }}>图片附件</label>

            {/* Existing images */}
            {currentImages.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {currentImages.map((url, idx) => (
                  <div key={url} style={{ position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', border: '1px solid rgba(227,82,5,0.16)' }} />
                    <button
                      onClick={() => removeExisting(url)}
                      style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(232,48,48,0.85)', border: 'none', color: '#fff', width: '18px', height: '18px', cursor: 'pointer', fontSize: 'var(--fs-caption)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Pending preview */}
            {previews.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {previews.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', border: '1px solid #C84406', opacity: 0.8 }} />
                    <button
                      onClick={() => removePending(idx)}
                      style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(232,48,48,0.85)', border: 'none', color: '#fff', width: '18px', height: '18px', cursor: 'pointer', fontSize: 'var(--fs-caption)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                    >×</button>
                    <div style={{ position: 'absolute', bottom: '2px', left: '2px', background: 'rgba(200,68,6,0.85)', color: '#fff', fontSize: 'var(--fs-caption)', padding: '1px 3px' }}>待上传</div>
                  </div>
                ))}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: '6px 14px', fontFamily: 'monospace', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', cursor: 'pointer', border: '1px solid rgba(227,82,5,0.16)', color: 'rgba(245,245,245,0.55)', background: '#0F1430' }}
            >
              + 选择图片
            </button>
            <span style={{ marginLeft: '10px', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)' }}>
              已保存 {currentImages.length} 张 · 待上传 {pendingFiles.length} 张
            </span>
          </div>

          {/* Footer row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#E83030', fontSize: '13px' }}>
              <input type="checkbox" checked={form.classified} onChange={e => set('classified', e.target.checked)} />
              机密（仅 Voyager 以上可见）
            </label>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '8px 24px', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.15em', cursor: saving ? 'not-allowed' : 'pointer', border: '1px solid #C84406', color: '#C84406', background: saving ? 'transparent' : 'rgba(200,68,6,0.08)', opacity: saving ? 0.6 : 1 }}
            >
              {uploading ? '上传图片中...' : saving ? '保存中...' : '保存'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: '1px solid rgba(227,82,5,0.16)', color: 'rgba(245,245,245,0.35)', padding: '8px 16px', fontFamily: 'monospace', fontSize: '12px', cursor: 'pointer' }}>取消</button>
          </div>
        </div>
      )}

      {/* ── Dashboard Feed Regenerate ── */}
      <div style={{ ...S.card, marginTop: '24px', borderColor: '#1A3040' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ color: '#E35205', fontSize: 'var(--fs-caption)', letterSpacing: '0.25em', marginBottom: '4px' }}>UPLINK // DASHBOARD FEED</div>
            <div style={{ color: 'rgba(245,245,245,0.55)', fontSize: '12px', fontFamily: 'monospace' }}>
              {feedLastGenerated
                ? `Last generated: ${new Date(feedLastGenerated).toLocaleString()}`
                : 'No feed generated yet'}
            </div>
          </div>
          <button
            onClick={async () => {
              setFeedGenerating(true)
              setFeedMsg(null)
              const res = await generateAndSaveFeed()
              setFeedGenerating(false)
              if (res.error) {
                setFeedMsg({ text: res.error, ok: false })
              } else {
                setFeedMsg({ text: 'Feed generated successfully', ok: true })
                if (res.feed?.generated_at) setFeedLastGenerated(res.feed.generated_at)
              }
            }}
            disabled={feedGenerating}
            style={{ padding: '8px 20px', fontFamily: 'monospace', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', cursor: feedGenerating ? 'not-allowed' : 'pointer', border: '1px solid #E35205', color: '#E35205', background: 'rgba(200,68,6,0.06)', opacity: feedGenerating ? 0.5 : 1 }}
          >
            {feedGenerating ? 'GENERATING...' : 'REGENERATE FEED'}
          </button>
        </div>
        {feedMsg && (
          <div style={{ marginTop: '10px', padding: '6px 10px', background: feedMsg.ok ? 'rgba(32,216,144,0.08)' : 'rgba(232,48,48,0.08)', border: `1px solid ${feedMsg.ok ? '#20D890' : '#E83030'}`, color: feedMsg.ok ? '#20D890' : '#E83030', fontSize: '12px', fontFamily: 'monospace' }}>
            {feedMsg.text}
          </div>
        )}
      </div>
    </div>
  )
}
