'use client'

import { useState, useEffect, useRef } from 'react'
import { getAllWorlds, createWorld, updateWorld, deleteWorld } from '@/lib/actions/worlds'
import type { World } from '@/types/database'
import { MemberPicker, type MemberValue } from '@/components/member-picker'

const S = {
  card:  { background: '#151B3A', border: '1px solid rgba(255,107,53,0.16)', padding: '20px', marginBottom: '16px' },
  th:    { textAlign: 'left' as const, padding: '8px 12px', color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', borderBottom: '1px solid rgba(255,107,53,0.16)', whiteSpace: 'nowrap' as const },
  td:    { padding: '8px 12px', color: 'rgba(245,245,245,0.55)', borderBottom: '1px solid #0F1430', verticalAlign: 'middle' as const, fontSize: '13px' },
  label: { display: 'block', color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', marginBottom: '4px' } as const,
  input: { width: '100%', background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)', color: '#F5F5F5', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const },
  area:  { width: '100%', background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)', color: '#F5F5F5', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const },
}

type F = {
  id: string; name: string; name_en: string; discoverer_name: string; discoverer_id: string | null
  discovery_date: string; gradient_from: string; gradient_to: string
  image_path: string; description: string; is_verified: boolean
}

const EMPTY: F = {
  id: '', name: '', name_en: '', discoverer_name: '', discoverer_id: null,
  discovery_date: new Date().toISOString().slice(0, 10),
  gradient_from: '#E8A020', gradient_to: '#C43020',
  image_path: '', description: '', is_verified: true,
}

function worldToForm(w: World): F {
  return { id: w.id, name: w.name, name_en: w.name_en, discoverer_name: w.discoverer_name, discoverer_id: w.discoverer_id, discovery_date: w.discovery_date, gradient_from: w.gradient_from, gradient_to: w.gradient_to, image_path: w.image_path ?? '', description: w.description, is_verified: w.is_verified }
}

function nextWorldId(items: World[]) {
  const nums = items.map(w => parseInt(w.id.replace('WLD-', ''))).filter(n => !isNaN(n))
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `WLD-${String(next).padStart(3, '0')}`
}

// Color picker with hex text input
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: 'block', color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', marginBottom: '4px' }}>{label}</label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: '40px', height: '34px', padding: '2px', border: '1px solid rgba(255,107,53,0.16)', background: '#0F1430', cursor: 'pointer' }}
        />
        <input
          style={{ ...S.input, flex: 1 }}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#E8A020"
        />
      </div>
    </div>
  )
}

export default function WorldsAdmin() {
  const [items, setItems]       = useState<World[]>([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState<F>(EMPTY)
  const [editId, setEditId]     = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const load = async () => { setLoading(true); setItems(await getAllWorlds()); setLoading(false) }
  useEffect(() => {
    let active = true
    getAllWorlds().then(w => { if (active) { setItems(w); setLoading(false) } })
    return () => { active = false }
  }, [])

  const openNew  = () => { setForm(EMPTY); setEditId(null); setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }
  const openEdit = (w: World) => { setForm(worldToForm(w)); setEditId(w.id); setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }
  const set = (k: keyof F, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))
  const setDiscoverer = (v: MemberValue) => setForm(f => ({ ...f, discoverer_id: v?.id ?? null, discoverer_name: v?.name ?? '' }))

  const handleSave = async () => {
    const id = form.id.trim() || nextWorldId(items)
    if (!form.name.trim()) { setMsg({ text: '名称不能为空', ok: false }); return }
    if (!form.discoverer_name.trim()) { setMsg({ text: '请选择或输入发现者姓名', ok: false }); return }
    setSaving(true); setMsg(null)
    const payload = {
      id, name: form.name.trim(), name_en: form.name_en.trim() || form.name.trim(),
      discoverer_id: form.discoverer_id, discoverer_name: form.discoverer_name.trim(),
      discovery_date: form.discovery_date,
      gradient_from: form.gradient_from, gradient_to: form.gradient_to,
      image_path: form.image_path.trim() || null,
      description: form.description.trim(), is_verified: form.is_verified,
    }
    const result = editId ? await updateWorld(editId, payload) : await createWorld(payload)
    setSaving(false)
    if (result?.error) { setMsg({ text: result.error, ok: false }); return }
    setMsg({ text: '保存成功 ✓', ok: true }); setShowForm(false); await load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(`删除世界记录 "${id}"？`)) return
    await deleteWorld(id); await load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.3em' }}>ADMIN // WORLDS</div>
          <div style={{ color: '#F5F5F5', fontSize: '20px', fontWeight: 'bold', marginTop: '2px' }}>平行世界管理</div>
        </div>
        <button onClick={openNew} style={{ padding: '8px 18px', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.15em', cursor: 'pointer', border: '1px solid #E85D04', color: '#E85D04', background: 'rgba(232,93,4,0.08)' }}>
          + 新增世界
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
                <th style={S.th}>渐变</th>
                <th style={S.th}>ID</th>
                <th style={S.th}>名称</th>
                <th style={S.th}>发现者</th>
                <th style={S.th}>发现日期</th>
                <th style={S.th}>认证</th>
                <th style={S.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: 'rgba(245,245,245,0.35)' }}>暂无数据</td></tr>}
              {items.map(w => (
                <tr key={w.id}>
                  <td style={S.td}>
                    <div style={{ width: '50px', height: '28px', background: `linear-gradient(135deg, ${w.gradient_from}, ${w.gradient_to})`, borderRadius: '2px' }} />
                  </td>
                  <td style={{ ...S.td, color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)' }}>{w.id}</td>
                  <td style={{ ...S.td, color: '#F5F5F5' }}>{w.name}</td>
                  <td style={S.td}>{w.discoverer_name}</td>
                  <td style={{ ...S.td, fontSize: 'var(--fs-caption)', whiteSpace: 'nowrap' }}>{w.discovery_date}</td>
                  <td style={S.td}>
                    <span style={{ fontSize: 'var(--fs-caption)', color: w.is_verified ? '#20D890' : 'rgba(245,245,245,0.35)' }}>
                      {w.is_verified ? '✓' : '—'}
                    </span>
                  </td>
                  <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => openEdit(w)} style={{ marginRight: '8px', background: 'none', border: 'none', color: '#E85D04', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}>编辑</button>
                    <button onClick={() => handleDelete(w.id)} style={{ background: 'none', border: 'none', color: '#E83030', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div ref={formRef} style={{ ...S.card, border: '1px solid #E85D04' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ color: '#E85D04', fontSize: '12px', letterSpacing: '0.2em' }}>{editId ? `编辑: ${editId}` : `新增世界 (自动 ID: ${nextWorldId(items)})`}</div>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'rgba(245,245,245,0.35)', cursor: 'pointer', fontSize: '18px' }}>×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={S.label}>ID（留空则自动生成）</label>
              <input style={S.input} value={form.id} onChange={e => set('id', e.target.value)} placeholder={nextWorldId(items)} disabled={!!editId} />
            </div>
            <div>
              <MemberPicker
                label="发现者姓名"
                value={form.discoverer_name ? { id: form.discoverer_id ?? '', name: form.discoverer_name } : null}
                onChange={setDiscoverer}
              />
            </div>
            <div>
              <label style={S.label}>发现日期</label>
              <input style={S.input} type="date" value={form.discovery_date} onChange={e => set('discovery_date', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={S.label}>中文名称 *</label>
              <input style={S.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="琥珀天顶" />
            </div>
            <div>
              <label style={S.label}>英文名称（为空则同中文）</label>
              <input style={S.input} value={form.name_en} onChange={e => set('name_en', e.target.value)} placeholder="Amber Zenith" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <ColorField label="渐变色 From" value={form.gradient_from} onChange={v => set('gradient_from', v)} />
            <ColorField label="渐变色 To" value={form.gradient_to} onChange={v => set('gradient_to', v)} />
          </div>

          {/* gradient preview */}
          <div style={{ marginBottom: '12px' }}>
            <label style={S.label}>渐变预览（无图片时显示）</label>
            <div style={{ height: '48px', background: `linear-gradient(135deg, ${form.gradient_from}, ${form.gradient_to})`, border: '1px solid rgba(255,107,53,0.16)' }} />
          </div>

          {/* image URL */}
          <div style={{ marginBottom: '12px' }}>
            <label style={S.label}>封面图片 URL（优先于渐变色）</label>
            <input style={S.input} value={form.image_path} onChange={e => set('image_path', e.target.value)} placeholder="https://..." />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={S.label}>世界描述</label>
            <textarea style={{ ...S.area, minHeight: '80px' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="简要描述这个平行世界的特征..." />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#20D890', fontSize: '13px' }}>
              <input type="checkbox" checked={form.is_verified} onChange={e => set('is_verified', e.target.checked)} />
              已认证
            </label>
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
