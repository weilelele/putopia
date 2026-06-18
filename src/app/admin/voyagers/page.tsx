'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAllVoyagers, setVoyagerBatch } from '@/lib/actions/profile'
import type { VoyagerProfile } from '@/types/database'

const DEFAULT_BATCH = 'Original Batch'

const S = {
  card: { background: '#151B3A', border: '1px solid rgba(255,107,53,0.16)', padding: '20px', marginBottom: '16px' },
  th:   { textAlign: 'left' as const, padding: '8px 12px', color: 'rgba(245,245,245,0.35)', fontSize: '11px', letterSpacing: '0.12em', borderBottom: '1px solid rgba(255,107,53,0.16)', whiteSpace: 'nowrap' as const },
  td:   { padding: '8px 12px', color: 'rgba(245,245,245,0.55)', borderBottom: '1px solid #0F1430', verticalAlign: 'middle' as const, fontSize: '13px' },
  input: { background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)', color: '#F5F5F5', padding: '6px 9px', fontFamily: 'var(--font-mono)', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' as const },
}

export default function VoyagersAdmin() {
  const [voyagers, setVoyagers] = useState<VoyagerProfile[]>([])
  const [loading, setLoading]   = useState(true)
  const [drafts, setDrafts]     = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null)

  const load = async () => {
    setLoading(true)
    const all = await getAllVoyagers()
    const members = all.filter((v) => v.role === 'voyager')
    setVoyagers(members)
    setDrafts(Object.fromEntries(members.map((v) => [v.id, v.batch_label || DEFAULT_BATCH])))
    setLoading(false)
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount; load() is the shared refetch reused after mutations
  useEffect(() => { load() }, [])

  // Distinct existing batch names → datalist for quick reuse
  const batchNames = useMemo(() => {
    const set = new Set<string>([DEFAULT_BATCH])
    voyagers.forEach((v) => set.add(v.batch_label || DEFAULT_BATCH))
    Object.values(drafts).forEach((d) => d.trim() && set.add(d.trim()))
    return [...set].sort()
  }, [voyagers, drafts])

  // Batch → count summary
  const summary = useMemo(() => {
    const map = new Map<string, number>()
    voyagers.forEach((v) => {
      const label = v.batch_label || DEFAULT_BATCH
      map.set(label, (map.get(label) ?? 0) + 1)
    })
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [voyagers])

  const handleSave = async (v: VoyagerProfile) => {
    const next = (drafts[v.id] ?? '').trim() || DEFAULT_BATCH
    setSavingId(v.id); setMsg(null)
    const res = await setVoyagerBatch(v.id, next)
    setSavingId(null)
    if (res.error) { setMsg({ text: res.error, ok: false }); return }
    setMsg({ text: `${v.display_name} → ${next}`, ok: true })
    await load()
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: '11px', letterSpacing: '0.3em' }}>ADMIN // VOYAGERS</div>
        <div style={{ color: '#F5F5F5', fontSize: '20px', fontWeight: 'bold', marginTop: '2px' }}>批次分配</div>
        <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: '12px', marginTop: '4px' }}>
          给 Voyager 指定批次名（可复用已有名称或直接输入新名称）。Architect 不参与批次。
        </div>
      </div>

      {/* Batch summary chips */}
      {!loading && summary.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {summary.map(([label, count]) => (
            <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: '#151B3A', border: '1px solid rgba(255,107,53,0.16)', fontSize: '12px', color: 'rgba(245,245,245,0.55)', fontFamily: 'var(--font-mono)' }}>
              {label}
              <span style={{ padding: '0 6px', borderRadius: '999px', background: 'rgba(232,93,4,0.14)', color: '#FF8A5C', fontSize: '11px' }}>{count}</span>
            </span>
          ))}
        </div>
      )}

      {msg && (
        <div style={{ marginBottom: '12px', padding: '8px 12px', background: msg.ok ? 'rgba(32,216,144,0.1)' : 'rgba(232,48,48,0.1)', border: `1px solid ${msg.ok ? '#20D890' : '#E83030'}`, color: msg.ok ? '#20D890' : '#E83030', fontSize: '13px' }}>
          {msg.text}
        </div>
      )}

      <datalist id="batch-names">
        {batchNames.map((n) => <option key={n} value={n} />)}
      </datalist>

      <div style={S.card}>
        {loading ? (
          <div style={{ color: 'rgba(245,245,245,0.35)', padding: '20px', textAlign: 'center' }}>加载中...</div>
        ) : voyagers.length === 0 ? (
          <div style={{ color: 'rgba(245,245,245,0.35)', padding: '20px', textAlign: 'center' }}>暂无 Voyager</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={S.th}>VOYAGER</th>
                <th style={{ ...S.th, width: '40%' }}>BATCH</th>
                <th style={{ ...S.th, width: '90px' }}></th>
              </tr>
            </thead>
            <tbody>
              {voyagers.map((v) => {
                const draft = drafts[v.id] ?? ''
                const current = v.batch_label || DEFAULT_BATCH
                const dirty = draft.trim() !== current && draft.trim() !== ''
                return (
                  <tr key={v.id}>
                    <td style={S.td}>
                      <div style={{ color: '#F5F5F5', fontFamily: 'var(--font-mono)' }}>{v.display_name}</div>
                      {v.location && <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: '11px' }}>{v.location}</div>}
                    </td>
                    <td style={S.td}>
                      <input
                        list="batch-names"
                        style={S.input}
                        value={draft}
                        placeholder={DEFAULT_BATCH}
                        onChange={(e) => setDrafts((d) => ({ ...d, [v.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && dirty) handleSave(v) }}
                      />
                    </td>
                    <td style={S.td}>
                      <button
                        onClick={() => handleSave(v)}
                        disabled={!dirty || savingId === v.id}
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.9rem', fontSize: '11px', opacity: !dirty || savingId === v.id ? 0.4 : 1, cursor: !dirty ? 'default' : 'pointer' }}
                      >
                        {savingId === v.id ? '...' : 'SAVE'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
