'use client'

import { useState, useEffect, useRef } from 'react'
import {
  getAllStories, updateStory, submitStory, publishStory, unpublishStory, deleteStory,
} from '@/lib/actions/stories'
import type { Story } from '@/types/database'
import { MemberPicker, type MemberValue } from '@/components/member-picker'

// ── shared styles ──────────────────────────────────────────────────────────
const S = {
  card:    { background: '#111525', border: '1px solid rgba(255,107,53,0.16)', padding: '20px', marginBottom: '16px' },
  th:      { textAlign: 'left' as const, padding: '8px 12px', color: '#4A5570', fontSize: '11px', letterSpacing: '0.12em', borderBottom: '1px solid rgba(255,107,53,0.16)', whiteSpace: 'nowrap' as const },
  td:      { padding: '8px 12px', color: '#8A9AB5', borderBottom: '1px solid #0D1020', verticalAlign: 'top' as const, fontSize: '13px' },
  label:   { display: 'block', color: '#4A5570', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '4px' } as const,
  input:   { width: '100%', background: '#0D1020', border: '1px solid rgba(255,107,53,0.16)', color: '#EDE8DE', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const },
  area:    { width: '100%', background: '#0D1020', border: '1px solid rgba(255,107,53,0.16)', color: '#EDE8DE', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const },
  row:     { display: 'grid', gap: '12px', marginBottom: '12px' } as const,
}

type F = {
  id: string; title: string; author_name: string; author_id: string | null; date: string
  tags: string; excerpt: string; content: string; youtube_id: string; is_published: boolean
}

const EMPTY: F = {
  id: '', title: '', author_name: '', author_id: null, date: new Date().toISOString().slice(0, 10),
  tags: '', excerpt: '', content: '', youtube_id: '', is_published: false,
}

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60)
}

function storyToForm(s: Story): F {
  return { ...s, tags: s.tags.join(', '), youtube_id: s.youtube_id ?? '', author_id: s.author_id }
}

// ── component ──────────────────────────────────────────────────────────────
export default function StoriesAdmin() {
  const [items, setItems]       = useState<Story[]>([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState<F>(EMPTY)
  const [editId, setEditId]     = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    setLoading(true)
    setItems(await getAllStories())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setForm(EMPTY); setEditId(null); setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const openEdit = (s: Story) => {
    setForm(storyToForm(s)); setEditId(s.id); setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const set = (k: keyof F, v: string | boolean | null) => setForm(f => ({ ...f, [k]: v }))
  const setAuthor = (v: MemberValue) => setForm(f => ({ ...f, author_id: v?.id ?? null, author_name: v?.name ?? '' }))

  const handleSave = async () => {
    if (!form.id.trim() || !form.title.trim()) {
      setMsg({ text: 'ID 和标题不能为空', ok: false }); return
    }
    setSaving(true); setMsg(null)
    const payload = {
      id: form.id.trim(),
      title: form.title.trim(),
      author_id: form.author_id,
      author_name: form.author_name.trim(),
      date: form.date,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      excerpt: form.excerpt.trim(),
      content: form.content,
      youtube_id: form.youtube_id.trim() || null,
      is_published: form.is_published,
    }
    const result = editId
      ? await updateStory(editId, payload)
      : await submitStory({ ...payload, author_name: payload.author_name || 'Unknown' })
    setSaving(false)
    if (result?.error) { setMsg({ text: result.error, ok: false }); return }
    setMsg({ text: '保存成功 ✓', ok: true })
    setShowForm(false)
    await load()
  }

  const handleTogglePublish = async (s: Story) => {
    const result = s.is_published ? await unpublishStory(s.id) : await publishStory(s.id)
    if (result?.error) setMsg({ text: result.error, ok: false })
    else await load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(`删除故事 "${id}"？此操作不可撤销。`)) return
    await deleteStory(id)
    await load()
  }

  return (
    <div>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ color: '#4A5570', fontSize: '11px', letterSpacing: '0.3em' }}>ADMIN // STORIES</div>
          <div style={{ color: '#EDE8DE', fontSize: '20px', fontWeight: 'bold', marginTop: '2px' }}>
            航行日志管理
          </div>
        </div>
        <button onClick={openNew} style={{ padding: '8px 18px', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.15em', cursor: 'pointer', border: '1px solid #E85A00', color: '#E85A00', background: 'rgba(232,90,0,0.08)' }}>
          + 新增故事
        </button>
      </div>

      {msg && (
        <div style={{ marginBottom: '12px', padding: '8px 12px', background: msg.ok ? 'rgba(32,216,144,0.1)' : 'rgba(232,48,48,0.1)', border: `1px solid ${msg.ok ? '#20D890' : '#E83030'}`, color: msg.ok ? '#20D890' : '#E83030', fontSize: '13px' }}>
          {msg.text}
        </div>
      )}

      {/* table */}
      <div style={S.card}>
        {loading ? (
          <div style={{ color: '#4A5570', padding: '20px', textAlign: 'center' }}>加载中...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={S.th}>ID / Slug</th>
                <th style={S.th}>标题</th>
                <th style={S.th}>作者</th>
                <th style={S.th}>日期</th>
                <th style={S.th}>状态</th>
                <th style={S.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#4A5570' }}>暂无数据</td></tr>
              )}
              {items.map(s => (
                <tr key={s.id}>
                  <td style={{ ...S.td, color: '#4A5570', fontSize: '11px' }}>{s.id}</td>
                  <td style={{ ...S.td, color: '#EDE8DE', maxWidth: '260px' }}>{s.title}</td>
                  <td style={S.td}>{s.author_name}</td>
                  <td style={{ ...S.td, whiteSpace: 'nowrap' }}>{s.date}</td>
                  <td style={S.td}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid', color: s.is_published ? '#20D890' : '#4A5570', borderColor: s.is_published ? 'rgba(32,216,144,0.4)' : 'rgba(255,107,53,0.16)' }}>
                      {s.is_published ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                  </td>
                  <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => openEdit(s)} style={{ marginRight: '8px', background: 'none', border: 'none', color: '#E85A00', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}>编辑</button>
                    <button onClick={() => handleTogglePublish(s)} style={{ marginRight: '8px', background: 'none', border: 'none', color: s.is_published ? '#4A5570' : '#20D890', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}>
                      {s.is_published ? '撤稿' : '发布'}
                    </button>
                    <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', color: '#E83030', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* edit form */}
      {showForm && (
        <div ref={formRef} style={{ ...S.card, border: '1px solid #E85A00' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ color: '#E85A00', fontSize: '12px', letterSpacing: '0.2em' }}>
              {editId ? `编辑: ${editId}` : '新增故事'}
            </div>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#4A5570', cursor: 'pointer', fontSize: '18px' }}>×</button>
          </div>

          <div style={{ ...S.row, gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={S.label}>ID (URL slug) *</label>
              <input
                style={S.input}
                value={form.id}
                onChange={e => set('id', e.target.value)}
                placeholder="e.g. my-story-slug"
                disabled={!!editId}
              />
              {!editId && form.title && (
                <button onClick={() => set('id', toSlug(form.title))} style={{ marginTop: '4px', background: 'none', border: 'none', color: '#4A5570', cursor: 'pointer', fontFamily: 'monospace', fontSize: '11px', padding: 0 }}>
                  ↻ 从标题生成: {toSlug(form.title)}
                </button>
              )}
            </div>
            <div>
              <label style={S.label}>日期 *</label>
              <input style={S.input} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
          </div>

          <div style={{ ...S.row, gridTemplateColumns: '2fr 1fr', marginBottom: '12px' }}>
            <div>
              <label style={S.label}>标题 *</label>
              <input style={S.input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="故事标题" />
            </div>
            <MemberPicker
              label="作者"
              value={form.author_id ? { id: form.author_id, name: form.author_name } : null}
              onChange={setAuthor}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={S.label}>标签（逗号分隔）</label>
            <input style={S.input} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="FIRST CONTACT, DISCOVERY, PERSONAL" />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={S.label}>YouTube 视频 ID（可选）</label>
            <input style={S.input} value={form.youtube_id} onChange={e => set('youtube_id', e.target.value)} placeholder="例：dQw4w9WgXcQ（URL 中 v= 后面的部分）" />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={S.label}>摘要（显示在列表页）</label>
            <textarea style={{ ...S.area, minHeight: '80px' }} value={form.excerpt} onChange={e => set('excerpt', e.target.value)} placeholder="2-3 句话的摘要..." />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={S.label}>正文内容（段落之间空一行）</label>
            <textarea style={{ ...S.area, minHeight: '400px' }} value={form.content} onChange={e => set('content', e.target.value)} placeholder="故事正文，段落间用空行分隔..." />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#8A9AB5', fontSize: '13px' }}>
              <input type="checkbox" checked={form.is_published} onChange={e => set('is_published', e.target.checked)} />
              直接发布（勾选则立即对 Voyager 可见）
            </label>

            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '8px 24px', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.15em', cursor: saving ? 'not-allowed' : 'pointer', border: '1px solid #E85A00', color: '#E85A00', background: saving ? 'transparent' : 'rgba(232,90,0,0.08)', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: '1px solid rgba(255,107,53,0.16)', color: '#4A5570', padding: '8px 16px', fontFamily: 'monospace', fontSize: '12px', cursor: 'pointer' }}>取消</button>
          </div>
        </div>
      )}
    </div>
  )
}
