'use client'

import { useState, useEffect } from 'react'
import { getAllVotes, deleteVote } from '@/lib/actions/votes'
import type { Vote, UserRole } from '@/types/database'

const S = {
  card:  { background: '#151B3A', border: '1px solid rgba(255,107,53,0.16)', padding: '20px', marginBottom: '16px' },
  th:    { textAlign: 'left' as const, padding: '8px 12px', color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', borderBottom: '1px solid rgba(255,107,53,0.16)', whiteSpace: 'nowrap' as const },
  td:    { padding: '8px 12px', color: 'rgba(245,245,245,0.55)', borderBottom: '1px solid #0F1430', verticalAlign: 'top' as const, fontSize: '13px' },
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function scopeLabel(scope: UserRole[]) {
  if (scope.includes('applicant')) return '全员'
  if (scope.includes('voyager')) return 'Voyager+'
  return 'Architect'
}

export default function VotesAdmin() {
  const [items, setItems]   = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg]       = useState<{ text: string; ok: boolean } | null>(null)

  const load = async () => { setLoading(true); setItems(await getAllVotes()); setLoading(false) }
  useEffect(() => {
    let active = true
    getAllVotes().then(v => { if (active) { setItems(v); setLoading(false) } })
    return () => { active = false }
  }, [])

  const handleDelete = async (v: Vote) => {
    if (!confirm(`删除投票「${v.title}」？\n\n此操作同时删除所有投票记录，不可撤销。`)) return
    const res = await deleteVote(v.id)
    if (res.error) { setMsg({ text: res.error, ok: false }); return }
    setMsg({ text: `已删除「${v.title}」`, ok: true })
    await load()
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.3em' }}>ADMIN // VOTES</div>
        <div style={{ color: '#F5F5F5', fontSize: '20px', fontWeight: 'bold', marginTop: '2px' }}>投票管理</div>
      </div>

      {msg && (
        <div style={{ marginBottom: '12px', padding: '8px 12px', background: msg.ok ? 'rgba(32,216,144,0.1)' : 'rgba(232,48,48,0.1)', border: `1px solid ${msg.ok ? '#20D890' : '#E83030'}`, color: msg.ok ? '#20D890' : '#E83030', fontSize: '13px' }}>
          {msg.text}
        </div>
      )}

      <div style={S.card}>
        {loading ? (
          <div style={{ color: 'rgba(245,245,245,0.35)', padding: '20px', textAlign: 'center' }}>加载中...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={S.th}>标题</th>
                <th style={S.th}>类型</th>
                <th style={S.th}>范围</th>
                <th style={S.th}>状态</th>
                <th style={S.th}>选项数</th>
                <th style={S.th}>截止</th>
                <th style={S.th}>创建时间</th>
                <th style={S.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={8} style={{ ...S.td, textAlign: 'center', color: 'rgba(245,245,245,0.35)' }}>暂无投票</td></tr>
              )}
              {items.map(v => (
                <tr key={v.id}>
                  <td style={{ ...S.td, color: '#F5F5F5', maxWidth: '260px' }}>{v.title}</td>
                  <td style={S.td}>
                    <span style={{ fontSize: 'var(--fs-caption)', color: v.type === 'multi' ? '#E8A020' : 'rgba(245,245,245,0.55)' }}>
                      {v.type === 'multi' ? '多选' : '单选'}
                    </span>
                  </td>
                  <td style={{ ...S.td, fontSize: 'var(--fs-caption)' }}>{scopeLabel(v.scope)}</td>
                  <td style={S.td}>
                    {v.is_active
                      ? <span style={{ fontSize: 'var(--fs-caption)', color: '#20D890' }}>进行中</span>
                      : <span style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)' }}>已关闭</span>}
                  </td>
                  <td style={{ ...S.td, fontSize: 'var(--fs-caption)' }}>{v.options.length}</td>
                  <td style={{ ...S.td, fontSize: 'var(--fs-caption)', whiteSpace: 'nowrap' }}>
                    {v.ends_at ? formatTs(v.ends_at) : <span style={{ color: 'rgba(245,245,245,0.35)' }}>—</span>}
                  </td>
                  <td style={{ ...S.td, fontSize: 'var(--fs-caption)', whiteSpace: 'nowrap' }}>{formatTs(v.created_at)}</td>
                  <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => handleDelete(v)}
                      style={{ background: 'none', border: 'none', color: '#E83030', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
