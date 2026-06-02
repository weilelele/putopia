'use client'

import { useState, useEffect, useRef } from 'react'
import {
  getAllDevices, createDevice, updateDevice, deleteDevice, uploadDeviceImage,
} from '@/lib/actions/devices'
import type { Device } from '@/types/database'
import { MemberPicker, type MemberValue } from '@/components/member-picker'

const S = {
  card:  { background: '#151B3A', border: '1px solid rgba(255,107,53,0.16)', padding: '20px', marginBottom: '16px' },
  th:    { textAlign: 'left' as const, padding: '8px 12px', color: 'rgba(245,245,245,0.35)', fontSize: '11px', letterSpacing: '0.12em', borderBottom: '1px solid rgba(255,107,53,0.16)', whiteSpace: 'nowrap' as const },
  td:    { padding: '8px 12px', color: 'rgba(245,245,245,0.55)', borderBottom: '1px solid #0F1430', verticalAlign: 'middle' as const, fontSize: '13px' },
  label: { display: 'block', color: 'rgba(245,245,245,0.35)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '4px' } as const,
  input: { width: '100%', background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)', color: '#F5F5F5', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const },
  area:  { width: '100%', background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)', color: '#F5F5F5', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const },
  sel:   { width: '100%', background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)', color: '#F5F5F5', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none' },
}

type F = {
  id: string; name: string; batch_id: string; knowledge: 'known' | 'unknown'
  location: string; description: string; image_path: string
  status: string; current_user_id: string | null; current_user_name: string; exploration_progress: number
}

const EMPTY: F = {
  id: '', name: '', batch_id: '', knowledge: 'known',
  location: '', description: '', image_path: '',
  status: 'available', current_user_id: null, current_user_name: '', exploration_progress: 0,
}

function deviceToForm(d: Device): F {
  return {
    id: d.id, name: d.name, batch_id: d.batch_id ?? '', knowledge: d.knowledge,
    location: d.location, description: d.description, image_path: d.image_path ?? '',
    status: d.status ?? 'available', current_user_id: d.current_user_id ?? null,
    current_user_name: d.current_user_name ?? '', exploration_progress: d.exploration_progress,
  }
}

// ── Image upload zone ────────────────────────────────────────────────────
function ImageZone({ value, onChange, active }: { value: string; onChange: (url: string) => void; active: boolean }) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setUploading(true); setErr('')
    const fd = new FormData()
    fd.append('image', file)
    const result = await uploadDeviceImage(fd)
    setUploading(false)
    if (result.error) { setErr(result.error); return }
    if (result.url) onChange(result.url)
  }

  // Global paste listener — active only when form is open
  useEffect(() => {
    if (!active) return
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'))
      if (item) { const f = item.getAsFile(); if (f) handleFile(f) }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  return (
    <div>
      <div
        style={{
          border: '1px dashed #151B3A',
          background: '#0F1430',
          minHeight: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '8px',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={() => fileRef.current?.click()}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="device" style={{ maxHeight: '160px', maxWidth: '100%', objectFit: 'cover' }} />
        ) : (
          <>
            <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: '12px' }}>点击选择图片</div>
            <div style={{ color: '#151B3A', fontSize: '11px' }}>或直接 Ctrl+V 粘贴</div>
          </>
        )}
        {uploading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,9,18,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E85D04', fontSize: '12px' }}>
            上传中...
          </div>
        )}
      </div>
      {value && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <button onClick={() => fileRef.current?.click()} style={{ background: 'none', border: '1px solid rgba(255,107,53,0.16)', color: 'rgba(245,245,245,0.35)', cursor: 'pointer', fontFamily: 'monospace', fontSize: '11px', padding: '3px 10px' }}>更换图片</button>
          <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', color: '#E83030', cursor: 'pointer', fontFamily: 'monospace', fontSize: '11px' }}>移除</button>
        </div>
      )}
      {err && <div style={{ color: '#E83030', fontSize: '12px', marginTop: '4px' }}>{err}</div>}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────
export default function DevicesAdmin() {
  const [items, setItems]       = useState<Device[]>([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState<F>(EMPTY)
  const [editId, setEditId]     = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const load = async () => { setLoading(true); setItems(await getAllDevices()); setLoading(false) }
  useEffect(() => { load() }, [])

  const openNew  = () => { setForm(EMPTY); setEditId(null); setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }
  const openEdit = (d: Device) => { setForm(deviceToForm(d)); setEditId(d.id); setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }
  const set = (k: keyof F, v: string | number | null) => setForm(f => ({ ...f, [k]: v }))
  const setCurrentUser = (v: MemberValue) => setForm(f => ({ ...f, current_user_id: v?.id ?? null, current_user_name: v?.name ?? '' }))

  const handleSave = async () => {
    if (!form.id.trim() || !form.name.trim()) { setMsg({ text: 'ID 和名称不能为空', ok: false }); return }
    setSaving(true); setMsg(null)
    const payload = {
      id: form.id.trim(), name: form.name.trim(),
      batch_id: form.batch_id.trim() || null,
      knowledge: form.knowledge,
      location: form.location.trim(),
      description: form.description.trim(),
      image_path: form.image_path || null,
      status: form.knowledge === 'known' ? (form.status as Device['status']) : null,
      current_user_id: form.knowledge === 'known' && form.status === 'in_use' ? form.current_user_id : null,
      current_user_name: form.knowledge === 'known' && form.status === 'in_use' ? form.current_user_name.trim() || null : null,
      exploration_progress: form.knowledge === 'unknown' ? Number(form.exploration_progress) : 0,
    }
    const result = editId
      ? await updateDevice(editId, payload)
      : await createDevice(payload)
    setSaving(false)
    if (result?.error) { setMsg({ text: result.error, ok: false }); return }
    setMsg({ text: '保存成功 ✓', ok: true }); setShowForm(false); await load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(`删除设备 "${id}"？`)) return
    await deleteDevice(id); await load()
  }

  const STATUS_COLOR: Record<string, string> = { available: '#20D890', in_use: '#E85D04', needs_repair: '#E83030', unknown: 'rgba(245,245,245,0.35)' }
  const STATUS_LABEL: Record<string, string> = { available: 'AVAILABLE', in_use: 'IN USE', needs_repair: 'NEEDS REPAIR', unknown: 'UNKNOWN' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: '11px', letterSpacing: '0.3em' }}>ADMIN // DEVICES</div>
          <div style={{ color: '#F5F5F5', fontSize: '20px', fontWeight: 'bold', marginTop: '2px' }}>设备管理</div>
        </div>
        <button onClick={openNew} style={{ padding: '8px 18px', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.15em', cursor: 'pointer', border: '1px solid #E85D04', color: '#E85D04', background: 'rgba(232,93,4,0.08)' }}>
          + 新增设备
        </button>
      </div>

      {msg && (
        <div style={{ marginBottom: '12px', padding: '8px 12px', background: msg.ok ? 'rgba(32,216,144,0.1)' : 'rgba(232,48,48,0.1)', border: `1px solid ${msg.ok ? '#20D890' : '#E83030'}`, color: msg.ok ? '#20D890' : '#E83030', fontSize: '13px' }}>
          {msg.text}
        </div>
      )}

      {/* table */}
      <div style={S.card}>
        {loading ? <div style={{ color: 'rgba(245,245,245,0.35)', padding: '20px', textAlign: 'center' }}>加载中...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={S.th}>图片</th>
                <th style={S.th}>ID</th>
                <th style={S.th}>名称</th>
                <th style={S.th}>类型</th>
                <th style={S.th}>位置</th>
                <th style={S.th}>状态</th>
                <th style={S.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: 'rgba(245,245,245,0.35)' }}>暂无数据</td></tr>}
              {items.map(d => (
                <tr key={d.id}>
                  <td style={S.td}>
                    {d.image_path
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={d.image_path} alt="" style={{ width: '60px', height: '40px', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: '60px', height: '40px', background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)' }} />
                    }
                  </td>
                  <td style={{ ...S.td, color: 'rgba(245,245,245,0.35)', fontSize: '11px' }}>{d.id}</td>
                  <td style={{ ...S.td, color: '#F5F5F5' }}>{d.name}</td>
                  <td style={S.td}>
                    <span style={{ fontSize: '11px', color: d.knowledge === 'known' ? '#20D890' : '#E85D04' }}>
                      {d.knowledge.toUpperCase()}
                    </span>
                  </td>
                  <td style={S.td}>{d.location}</td>
                  <td style={S.td}>
                    {d.knowledge === 'known' && d.status && (
                      <span style={{ fontSize: '11px', color: STATUS_COLOR[d.status] }}>
                        {STATUS_LABEL[d.status]}
                      </span>
                    )}
                    {d.knowledge === 'unknown' && (
                      <span style={{ fontSize: '11px', color: '#E85D04' }}>{d.exploration_progress}%</span>
                    )}
                  </td>
                  <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => openEdit(d)} style={{ marginRight: '8px', background: 'none', border: 'none', color: '#E85D04', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}>编辑</button>
                    <button onClick={() => handleDelete(d.id)} style={{ background: 'none', border: 'none', color: '#E83030', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* edit form */}
      {showForm && (
        <div ref={formRef} style={{ ...S.card, border: '1px solid #E85D04' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ color: '#E85D04', fontSize: '12px', letterSpacing: '0.2em' }}>{editId ? `编辑: ${editId}` : '新增设备'}</div>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'rgba(245,245,245,0.35)', cursor: 'pointer', fontSize: '18px' }}>×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={S.label}>ID *</label>
              <input style={S.input} value={form.id} onChange={e => set('id', e.target.value)} placeholder="kn-5 / uk-4" disabled={!!editId} />
            </div>
            <div>
              <label style={S.label}>类型 *</label>
              <select style={S.sel} value={form.knowledge} onChange={e => set('knowledge', e.target.value)}>
                <option value="known">Known（已知）</option>
                <option value="unknown">Unknown（未知）</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={S.label}>名称 *</label>
              <input style={S.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Unit 001 — The Originator" />
            </div>
            <div>
              <label style={S.label}>Batch ID（可选）</label>
              <input style={S.input} value={form.batch_id} onChange={e => set('batch_id', e.target.value)} placeholder="BATCH-07" />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={S.label}>地点</label>
            <input style={S.input} value={form.location} onChange={e => set('location', e.target.value)} placeholder="Berlin, Germany" />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={S.label}>描述</label>
            <textarea style={{ ...S.area, minHeight: '80px' }} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* conditional fields */}
          {form.knowledge === 'known' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={S.label}>状态</label>
                <select style={S.sel} value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="available">AVAILABLE</option>
                  <option value="in_use">IN USE</option>
                  <option value="needs_repair">NEEDS REPAIR</option>
                  <option value="unknown">UNKNOWN</option>
                </select>
              </div>
              {form.status === 'in_use' && (
                <MemberPicker
                  label="当前使用者"
                  value={form.current_user_id ? { id: form.current_user_id, name: form.current_user_name } : null}
                  onChange={setCurrentUser}
                />
              )}
            </div>
          )}

          {form.knowledge === 'unknown' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={S.label}>探索进度（0–100）</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range" min={0} max={100} value={form.exploration_progress}
                  onChange={e => set('exploration_progress', Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ color: '#E85D04', fontSize: '13px', minWidth: '36px' }}>{form.exploration_progress}%</span>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={S.label}>设备图片（点击选择 / 直接 Ctrl+V 粘贴）</label>
            <ImageZone value={form.image_path} onChange={url => set('image_path', url)} active={showForm} />
            <div style={{ marginTop: '6px' }}>
              <label style={S.label}>或手动输入图片 URL / 本地路径</label>
              <input style={S.input} value={form.image_path} onChange={e => set('image_path', e.target.value)} placeholder="/devices/unit-001.jpg 或 https://..." />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 24px', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.15em', cursor: saving ? 'not-allowed' : 'pointer', border: '1px solid #E85D04', color: '#E85D04', background: saving ? 'transparent' : 'rgba(232,93,4,0.08)', opacity: saving ? 0.6 : 1 }}>
              {saving ? '保存中...' : '保存'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: '1px solid rgba(255,107,53,0.16)', color: 'rgba(245,245,245,0.35)', padding: '8px 16px', fontFamily: 'monospace', fontSize: '12px', cursor: 'pointer' }}>取消</button>
          </div>
        </div>
      )}
    </div>
  )
}
