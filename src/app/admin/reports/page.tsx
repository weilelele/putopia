'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { listOpenReports, resolveReport, type OpenReport } from '@/lib/actions/moderation'
import { REPORT_REASONS } from '@/lib/moderation-model'

const reasonLabel = (value: string) => REPORT_REASONS.find((r) => r.value === value)?.label ?? value

export default function ReportsAdmin() {
  const [reports, setReports] = useState<OpenReport[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try { setReports(await listOpenReports()) } catch { setError('Could not load reports.') }
  }, [])
  useEffect(() => { void Promise.resolve().then(load) }, [load])

  async function resolve(id: string, outcome: 'removed' | 'dismissed') {
    if (outcome === 'removed' && !window.confirm('Remove this content for everyone? This cannot be undone.')) return
    setBusyId(id); setError('')
    const result = await resolveReport(id, outcome)
    setBusyId(null)
    if (result.error) { setError(result.error); return }
    await load()
  }

  return (
    <div>
      <h1>CONTENT REPORTS</h1>
      <p>Reports from members, oldest first. Review each within 24 hours: remove content that breaks the rules, dismiss the rest.</p>
      {error && <p role="alert">{error}</p>}
      {reports === null ? <p>Loading…</p> : reports.length === 0 ? <p>No open reports.</p> : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 14 }}>
          {reports.map((r) => (
            <li key={r.id} style={{ border: '1px solid rgba(227,82,5,0.25)', background: 'var(--color-void)', padding: 16, display: 'grid', gap: 8 }}>
              <strong>{reasonLabel(r.reason)} · {r.where}</strong>
              <span style={{ color: 'var(--color-star-dim)', fontSize: 'var(--fs-label)' }}>
                {new Date(r.created_at).toLocaleString()} · reported by {r.reporter_name} · author {r.author_name}
              </span>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{r.body}</p>
              {r.details && <p style={{ margin: 0, color: 'var(--color-star-dim)' }}>Reporter note: {r.details}</p>}
              <div style={{ display: 'flex', gap: 12 }}>
                <ArchiveButton variant="destructive" size="compact" disabled={busyId === r.id} onClick={() => resolve(r.id, 'removed')}>REMOVE CONTENT</ArchiveButton>
                <ArchiveButton variant="secondary" size="compact" disabled={busyId === r.id} onClick={() => resolve(r.id, 'dismissed')}>DISMISS</ArchiveButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
