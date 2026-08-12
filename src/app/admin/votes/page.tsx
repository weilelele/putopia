'use client'

import { useState, useEffect } from 'react'
import { getAllVotes, deleteVote } from '@/lib/actions/votes'
import {
  closeDeviceBatchDecision,
  createDeviceBatchDecision,
  listDeviceBatchDecisionAdminOptions,
  type DeviceBatchDecisionAdminOption,
} from '@/lib/actions/device-batch-community'
import type { Vote, UserRole } from '@/types/database'

const S = {
  card:  { background: '#151B3A', border: '1px solid rgba(227,82,5,0.16)', padding: '20px', marginBottom: '16px' },
  th:    { textAlign: 'left' as const, padding: '8px 12px', color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', borderBottom: '1px solid rgba(227,82,5,0.16)', whiteSpace: 'nowrap' as const },
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
  const [batches, setBatches] = useState<DeviceBatchDecisionAdminOption[]>([])
  const [showDecision, setShowDecision] = useState(false)
  const [batchSlug, setBatchSlug] = useState('')
  const [decisionTitle, setDecisionTitle] = useState('')
  const [decisionSummary, setDecisionSummary] = useState('')
  const [decisionOptions, setDecisionOptions] = useState('')
  const [decisionClosesAt, setDecisionClosesAt] = useState('')
  const [creating, setCreating] = useState(false)

  const load = async () => { setLoading(true); setItems(await getAllVotes()); setLoading(false) }
  useEffect(() => {
    let active = true
    Promise.all([getAllVotes(), listDeviceBatchDecisionAdminOptions()]).then(([votes, batchOptions]) => {
      if (active) {
        setItems(votes)
        setBatches(batchOptions)
        setBatchSlug(batchOptions[0]?.slug ?? '')
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [])

  const handleDelete = async (v: Vote) => {
    const isBatchDecision = !!v.device_batch_slug
    if (!confirm(isBatchDecision
      ? `关闭 Batch 决策「${v.title}」？投票记录会保留。`
      : `删除投票「${v.title}」？\n\n此操作同时删除所有投票记录，不可撤销。`)) return
    const res = isBatchDecision
      ? await closeDeviceBatchDecision(v.id, v.device_batch_slug!)
      : await deleteVote(v.id)
    if (res.error) { setMsg({ text: res.error, ok: false }); return }
    setMsg({ text: `已删除「${v.title}」`, ok: true })
    await load()
  }

  const handleCreateDecision = async () => {
    setCreating(true)
    setMsg(null)
    const result = await createDeviceBatchDecision({
      batchSlug,
      closesAt: decisionClosesAt,
      options: decisionOptions.split('\n'),
      summary: decisionSummary,
      title: decisionTitle,
    })
    setCreating(false)
    if (result.error) {
      setMsg({ text: result.error, ok: false })
      return
    }
    setMsg({ text: 'Batch holder decision 已上线', ok: true })
    setDecisionTitle('')
    setDecisionSummary('')
    setDecisionOptions('')
    setDecisionClosesAt('')
    setShowDecision(false)
    await load()
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ color: '#F5F5F5', fontSize: '20px', fontWeight: 'bold', marginTop: '2px' }}>投票管理</div>
          <button
            onClick={() => setShowDecision((visible) => !visible)}
            style={{ background: '#E35205', border: 0, color: '#0A0E27', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 700, padding: '9px 14px' }}
          >
            {showDecision ? '取消' : '+ 新建 Batch Holder 决策'}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ marginBottom: '12px', padding: '8px 12px', background: msg.ok ? 'rgba(32,216,144,0.1)' : 'rgba(232,48,48,0.1)', border: `1px solid ${msg.ok ? '#20D890' : '#E83030'}`, color: msg.ok ? '#20D890' : '#E83030', fontSize: '13px' }}>
          {msg.text}
        </div>
      )}

      {showDecision && (
        <div style={S.card}>
          <div style={{ color: '#E35205', fontSize: 'var(--fs-caption)', letterSpacing: '0.15em', marginBottom: '14px' }}>BATCH HOLDER DECISION</div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <select value={batchSlug} onChange={(event) => setBatchSlug(event.target.value)} style={{ background: '#0F1430', border: '1px solid rgba(227,82,5,0.3)', color: '#F5F5F5', fontSize: '13px', padding: '9px' }}>
              {batches.map((batch) => <option key={batch.slug} value={batch.slug}>{batch.code} · {batch.name}</option>)}
            </select>
            <input value={decisionTitle} onChange={(event) => setDecisionTitle(event.target.value)} placeholder="决策问题" style={{ background: '#0F1430', border: '1px solid rgba(227,82,5,0.3)', color: '#F5F5F5', fontSize: '13px', padding: '9px' }} />
            <textarea value={decisionSummary} onChange={(event) => setDecisionSummary(event.target.value)} placeholder="为什么需要 Holder 决策" rows={3} style={{ background: '#0F1430', border: '1px solid rgba(227,82,5,0.3)', color: '#F5F5F5', fontSize: '13px', padding: '9px' }} />
            <textarea value={decisionOptions} onChange={(event) => setDecisionOptions(event.target.value)} placeholder={'每行一个选项\n选项 A\n选项 B'} rows={4} style={{ background: '#0F1430', border: '1px solid rgba(227,82,5,0.3)', color: '#F5F5F5', fontSize: '13px', padding: '9px' }} />
            <label style={{ color: 'rgba(245,245,245,0.55)', fontSize: 'var(--fs-caption)' }}>
              截止时间
              <input type="datetime-local" value={decisionClosesAt} onChange={(event) => setDecisionClosesAt(event.target.value)} style={{ background: '#0F1430', border: '1px solid rgba(227,82,5,0.3)', color: '#F5F5F5', display: 'block', fontSize: '13px', marginTop: '5px', padding: '9px', width: '100%' }} />
            </label>
            <button disabled={creating || !batchSlug} onClick={handleCreateDecision} style={{ background: '#E35205', border: 0, color: '#0A0E27', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 700, justifySelf: 'start', padding: '9px 16px' }}>
              {creating ? '上线中…' : '上线 Holder 决策'}
            </button>
          </div>
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
                      {v.device_batch_slug ? '关闭' : '删除'}
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
