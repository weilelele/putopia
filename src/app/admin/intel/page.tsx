'use client'

import { useState, useEffect, useRef } from 'react'
import {
  getAllIntel, createIntel, updateIntel, deleteIntel,
} from '@/lib/actions/intel'
import type { Intel, IntelTag } from '@/types/database'

const S = {
  card:  { background: '#111525', border: '1px solid #1E2840', padding: '20px', marginBottom: '16px' },
  th:    { textAlign: 'left' as const, padding: '8px 12px', color: '#4A5570', fontSize: '11px', letterSpacing: '0.12em', borderBottom: '1px solid #1A2238', whiteSpace: 'nowrap' as const },
  td:    { padding: '8px 12px', color: '#8A9AB5', borderBottom: '1px solid #0D1020', verticalAlign: 'top' as const, fontSize: '13px' },
  label: { display: 'block', color: '#4A5570', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '4px' } as const,
  input: { width: '100%', background: '#0D1020', border: '1px solid #1E2840', color: '#EDE8DE', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const },
  area:  { width: '100%', background: '#0D1020', border: '1px solid #1E2840', color: '#EDE8DE', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const },
  sel:   { width: '100%', background: '#0D1020', border: '1px solid #1E2840', color: '#EDE8DE', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none' },
}

const TAG_COLOR: Record<IntelTag, string> = { NOTICE: '#8A9AB5', DEVICE: '#E85A00', ORG: '#00C8C8' }

type F = { id: string; title: string; content: string; timestamp: string; tag: IntelTag; classified: boolean }

const EMPTY: F = {
  id: '', title: '', content: '',
  timestamp: new Date().toISOString().slice(0, 16),
  tag: 'NOTICE', classified: false,
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
  const [items, setItems]       = useState<Intel[]>([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState<F>(EMPTY)
  const [editId, setEditId]     = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const load = async () => { setLoading(true); setItems(await getAllIntel()); setLoading(false) }
  useEffect(() => { load() }, [])

  const openNew = () => {
    setForm({ ...EMPTY, id: '' }) // will auto-fill on render
    setEditId(null); setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const openEdit = (i: Intel) => {
    setForm({ id: i.id, title: i.title, content: i.content, timestamp: i.timestamp.slice(0, 16), tag: i.tag, classified: i.classified })
    setEditId(i.id); setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const set = (k: keyof F, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    const id = (form.id.trim() || nextIntelId(items))
    if (!form.title.trim()) { setMsg({ text: '标题不能为空', ok: false }); return }
    setSaving(true); setMsg(null)
    const payload = {
      id, title: form.title.trim(), content: form.content.trim(),
      timestamp: new Date(form.timestamp).toISOString(),
      tag: form.tag, classified: form.classified, created_by: null,
    }
    const result = editId ? await updateIntel(editId, payload) : await createIntel(payload)
    setSaving(false)
    if (result?.error) { setMsg({ text: result.error, ok: false }); return }
    setMsg({ text: '保存成功 ✓', ok: true }); setShowForm(false); await load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(`删除情报 "${id}"？`)) return
    await deleteIntel(id); await load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ color: '#4A5570', fontSize: '11px', letterSpacing: '0.3em' }}>ADMIN // INTEL</div>
          <div style={{ color: '#EDE8DE', fontSize: '20px', fontWeight: 'bold', marginTop: '2px' }}>情报管理</div>
        </div>
        <button onClick={openNew} style={{ padding: '8px 18px', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.15em', cursor: 'pointer', border: '1px solid #E85A00', color: '#E85A00', background: 'rgba(232,90,0,0.08)' }}>
          + 新增情报
        </button>
      </div>

      {msg && (
        <div style={{ marginBottom: '12px', padding: '8px 12px', background: msg.ok ? 'rgba(32,216,144,0.1)' : 'rgba(232,48,48,0.1)', border: `1px solid ${msg.ok ? '#20D890' : '#E83030'}`, color: msg.ok ? '#20D890' : '#E83030', fontSize: '13px' }}>
          {msg.text}
        </div>
      )}

      <div style={S.card}>
        {loading ? <div style={{ color: '#4A5570', padding: '20px', textAlign: 'center' }}>加载中...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={S.th}>ID</th>
                <th style={S.th}>标题</th>
                <th style={S.th}>类型</th>
                <th style={S.th}>级别</th>
                <th style={S.th}>时间</th>
                <th style={S.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#4A5570' }}>暂无数据</td></tr>}
              {items.map(i => (
                <tr key={i.id}>
                  <td style={{ ...S.td, color: '#4A5570', fontSize: '11px' }}>{i.id}</td>
                  <td style={{ ...S.td, color: '#EDE8DE', maxWidth: '300px' }}>{i.title}</td>
                  <td style={S.td}>
                    <span style={{ fontSize: '11px', color: TAG_COLOR[i.tag] }}>{i.tag}</span>
                  </td>
                  <td style={S.td}>
                    {i.classified
                      ? <span style={{ fontSize: '11px', color: '#E83030' }}>⊘ 机密</span>
                      : <span style={{ fontSize: '11px', color: '#4A5570' }}>公开</span>
                    }
                  </td>
                  <td style={{ ...S.td, fontSize: '11px', whiteSpace: 'nowrap' }}>{formatTs(i.timestamp)}</td>
                  <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => openEdit(i)} style={{ marginRight: '8px', background: 'none', border: 'none', color: '#E85A00', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}>编辑</button>
                    <button onClick={() => handleDelete(i.id)} style={{ background: 'none', border: 'none', color: '#E83030', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div ref={formRef} style={{ ...S.card, border: '1px solid #E85A00' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ color: '#E85A00', fontSize: '12px', letterSpacing: '0.2em' }}>{editId ? `编辑: ${editId}` : `新增情报 (自动 ID: ${nextIntelId(items)})`}</div>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#4A5570', cursor: 'pointer', fontSize: '18px' }}>×</button>
          </div>

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

          <div style={{ marginBottom: '12px' }}>
            <label style={S.label}>标题 *</label>
            <input style={S.input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="情报标题" />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={S.label}>正文内容</label>
            <textarea style={{ ...S.area, minHeight: '120px' }} value={form.content} onChange={e => set('content', e.target.value)} placeholder="情报详细内容..." />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#E83030', fontSize: '13px' }}>
              <input type="checkbox" checked={form.classified} onChange={e => set('classified', e.target.checked)} />
              机密（仅 Voyager 以上可见）
            </label>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 24px', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.15em', cursor: saving ? 'not-allowed' : 'pointer', border: '1px solid #E85A00', color: '#E85A00', background: saving ? 'transparent' : 'rgba(232,90,0,0.08)', opacity: saving ? 0.6 : 1 }}>
              {saving ? '保存中...' : '保存'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: '1px solid #1E2840', color: '#4A5570', padding: '8px 16px', fontFamily: 'monospace', fontSize: '12px', cursor: 'pointer' }}>取消</button>
          </div>
        </div>
      )}
    </div>
  )
}
