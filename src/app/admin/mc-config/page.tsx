'use client'

import { useState, useEffect } from 'react'
import { getMcFunctions, createMcFunction, updateMcFunction, deleteMcFunction } from '@/lib/actions/mc-functions'
import type { McFunction, McFunctionStatus } from '@/types/database'
import { Plus, Trash2, GripVertical } from 'lucide-react'

const STATUS_OPTIONS: { value: McFunctionStatus; label: string; color: string }[] = [
  { value: 'active',         label: '生效',   color: '#22D890' },
  { value: 'in_development', label: '开发中', color: '#FF5A1F' },
  { value: 'unknown',        label: '未知',   color: '#4A5570' },
]

function statusMeta(s: McFunctionStatus) {
  return STATUS_OPTIONS.find(o => o.value === s) ?? STATUS_OPTIONS[2]
}

export default function McConfigPage() {
  const [fns, setFns]       = useState<McFunction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newStatus, setNewStatus] = useState<McFunctionStatus>('active')
  const [adding, setAdding]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    getMcFunctions().then(data => { setFns(data as McFunction[]); setLoading(false) })
  }, [])

  const handleStatusChange = async (id: string, status: McFunctionStatus) => {
    setSaving(id)
    setFns(prev => prev.map(f => f.id === id ? { ...f, status } : f))
    await updateMcFunction(id, { status })
    setSaving(null)
  }

  const handleNameBlur = async (id: string, name: string) => {
    if (!name.trim()) return
    setSaving(id)
    await updateMcFunction(id, { name: name.trim() })
    setSaving(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this function?')) return
    setFns(prev => prev.filter(f => f.id !== id))
    await deleteMcFunction(id)
  }

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    setError(null)
    const maxOrder = fns.reduce((m, f) => Math.max(m, f.sort_order), 0)
    const result = await createMcFunction({ name: newName.trim(), status: newStatus, sort_order: maxOrder + 1 })
    if (result.error) { setError(result.error); setAdding(false); return }
    setFns(prev => [...prev, result.data as McFunction])
    setNewName('')
    setNewStatus('active')
    setAdding(false)
  }

  return (
    <div className="main">
      <div className="top-bar">
        <div className="crumbs">PC://ADMIN <span>/</span> MC UNIT CONFIG</div>
      </div>

      <div style={{ maxWidth: 640, width: '100%' }}>
        <div className="page-head">
          <div>
            <div className="h-eyebrow">// ADMIN</div>
            <h1>MC UNIT <span className="accent">CONFIG</span></h1>
            <p className="sub">Configure confirmed functions displayed on the public dashboard</p>
          </div>
        </div>

        {/* Function list */}
        <div className="hud-frame" style={{ marginBottom: '1.5rem' }}>
          <div className="hud-tick-rail hud-tick-left" />
          <div className="hud-tick-rail hud-tick-right" />
          <div style={{ padding: '0 0.5rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.22em', color: 'var(--color-star-deep)', marginBottom: '0.75rem' }}>
              CONFIRMED FUNCTIONS
            </div>

            {loading ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-star-deep)', padding: '1rem 0' }}>LOADING...</div>
            ) : fns.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-star-deep)', padding: '1rem 0' }}>No functions configured yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {fns.map(fn => {
                  const meta = statusMeta(fn.status)
                  return (
                    <div key={fn.id} style={{
                      display: 'grid', gridTemplateColumns: '20px 1fr 160px 32px',
                      gap: '0.75rem', alignItems: 'center',
                      padding: '0.55rem 0.75rem',
                      background: '#0D1020', border: '1px solid #1E2840',
                      opacity: saving === fn.id ? 0.6 : 1, transition: 'opacity 0.2s',
                    }}>
                      <GripVertical size={14} style={{ color: '#4A5570', cursor: 'grab' }} />

                      {/* Name */}
                      <input
                        defaultValue={fn.name}
                        onBlur={e => handleNameBlur(fn.id, e.target.value)}
                        style={{
                          background: 'transparent', border: 'none', outline: 'none',
                          fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                          color: 'var(--color-star-dim)', width: '100%',
                        }}
                      />

                      {/* Status selector */}
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {STATUS_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => handleStatusChange(fn.id, opt.value)}
                            style={{
                              fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
                              letterSpacing: '0.08em', padding: '3px 8px',
                              border: `1px solid ${fn.status === opt.value ? opt.color : '#1E2840'}`,
                              background: fn.status === opt.value ? `${opt.color}18` : 'transparent',
                              color: fn.status === opt.value ? opt.color : '#4A5570',
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(fn.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A5570', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Add new */}
        <div className="hud-frame">
          <div className="hud-tick-rail hud-tick-left" />
          <div className="hud-tick-rail hud-tick-right" />
          <div style={{ padding: '0 0.5rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.22em', color: 'var(--color-star-deep)', marginBottom: '0.75rem' }}>
              ADD FUNCTION
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#4A5570', marginBottom: '0.35rem', letterSpacing: '0.12em' }}>NAME</div>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="Function name..."
                  className="input-dark"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#4A5570', marginBottom: '0.35rem', letterSpacing: '0.12em' }}>STATUS</div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setNewStatus(opt.value)}
                      style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                        letterSpacing: '0.08em', padding: '5px 10px',
                        border: `1px solid ${newStatus === opt.value ? opt.color : '#1E2840'}`,
                        background: newStatus === opt.value ? `${opt.color}18` : 'transparent',
                        color: newStatus === opt.value ? opt.color : '#4A5570',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleAdd}
                disabled={!newName.trim() || adding}
                className="btn-primary"
                style={{ padding: '0.5rem 1.1rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={12} /> ADD
              </button>
            </div>
            {error && (
              <div style={{ marginTop: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-fault)' }}>{error}</div>
            )}
          </div>
        </div>
      </div>

      <div className="footer-bar" style={{ marginTop: 'auto', paddingTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>MC CONFIG</div>
      </div>
    </div>
  )
}
