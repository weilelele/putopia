'use client'

import { useId, useState } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveTextarea } from '@/components/archive-input'
import { useAuth } from '@/lib/auth-context'
import { blockAuthor, reportContent, type ReportTarget } from '@/lib/actions/moderation'
import { REPORT_DETAILS_MAX, REPORT_REASONS, type ReportReason } from '@/lib/moderation-model'
import styles from './report-block-actions.module.css'

type Panel = 'closed' | 'report' | 'block' | 'done'

/**
 * "Report" and "Block" controls for someone else's discussion post. Shown only
 * to signed-in members. `onChanged` fires once the action succeeded so the host
 * list can drop the now-hidden content.
 */
export function ReportBlockActions({
  target,
  authorName,
  isOwn,
  onChanged,
}: {
  target: ReportTarget
  authorName: string
  isOwn: boolean
  onChanged: (change: 'report' | 'block') => void
}) {
  const { user } = useAuth()
  const groupId = useId()
  const [panel, setPanel] = useState<Panel>('closed')
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [doneText, setDoneText] = useState('')

  if (!user.id || isOwn) return null

  const close = () => { setPanel('closed'); setError('') }

  async function sendReport() {
    if (!reason) { setError('Choose a reason for the report.'); return }
    setBusy(true); setError('')
    const result = await reportContent(target, reason, details)
    setBusy(false)
    if (result.error) { setError(result.error); return }
    setDoneText('Thanks. This is hidden for you now, and we review reports within 24 hours.')
    setPanel('done')
    onChanged('report')
  }

  async function confirmBlock() {
    setBusy(true); setError('')
    const result = await blockAuthor(target)
    setBusy(false)
    if (result.error) { setError(result.error); return }
    setDoneText(`${authorName} is blocked. You can unblock from My Profile.`)
    setPanel('done')
    onChanged('block')
  }

  return (
    <div className={styles.root}>
      {panel === 'closed' && (
        <div className={styles.row}>
          <ArchiveButton variant="ghost" className={styles.link} onClick={() => setPanel('report')} aria-label={`Report content by ${authorName}`}>Report</ArchiveButton>
          <ArchiveButton variant="ghost" className={styles.link} onClick={() => setPanel('block')} aria-label={`Block ${authorName}`}>Block</ArchiveButton>
        </div>
      )}

      {panel === 'report' && (
        <div className={styles.panel} role="group" aria-labelledby={groupId}>
          <p id={groupId} className={styles.title}>Report this content</p>
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className={styles.option}>
              <input type="radio" name={groupId} checked={reason === r.value} onChange={() => setReason(r.value)} />
              {r.label}
            </label>
          ))}
          <ArchiveTextarea value={details} maxLength={REPORT_DETAILS_MAX} rows={2} onChange={(e) => setDetails(e.target.value)} placeholder="Add details (optional)" aria-label="Report details" />
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.row}>
            <ArchiveButton size="compact" onClick={sendReport} loading={busy}>Send report</ArchiveButton>
            <ArchiveButton size="compact" variant="secondary" onClick={close} disabled={busy}>Cancel</ArchiveButton>
          </div>
        </div>
      )}

      {panel === 'block' && (
        <div className={styles.panel} role="group" aria-label={`Block ${authorName}`}>
          <p className={styles.title}>Block {authorName}?</p>
          <p className={styles.note}>You will no longer see their posts. They are not told. You can unblock from My Profile.</p>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.row}>
            <ArchiveButton size="compact" variant="destructive" onClick={confirmBlock} loading={busy}>Block</ArchiveButton>
            <ArchiveButton size="compact" variant="secondary" onClick={close} disabled={busy}>Cancel</ArchiveButton>
          </div>
        </div>
      )}

      {panel === 'done' && <p className={styles.note} role="status">{doneText}</p>}
    </div>
  )
}
