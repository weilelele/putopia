'use client'

import { useState } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveInput, ArchiveTextarea } from '@/components/archive-input'

export function WebPushPreview() {
  const [draft, setDraft] = useState({ campaignKey: 'voyager-invitation-draft', title: 'Voyager is open', body: 'Take a look inside the Console. Your initiation begins here.', route: '/voyager-initiation?briefing=1', recipients: '' })
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  function update(field: keyof typeof draft, value: string) {
    setDraft(previous => ({ ...previous, [field]: value }))
    setNextCursor(null)
    setResult('')
  }
  async function preview(cursor?: string) {
    setBusy(true)
    setNextCursor(null)
    try {
      const { recipients, ...spec } = draft
      const response = await fetch('/api/push/web/campaign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'preview', cursor, spec: { ...spec, userIds: recipients.split(/[\s,]+/).filter(Boolean) } }) })
      const data = await response.json()
      setResult(response.ok ? `${data.eligibleUsers} users / ${data.eligibleDevices} devices in this batch. ${data.nextCursor ? 'More devices remain. ' : 'No more devices remain. '}Preview only; no notifications sent.` : data.error)
      if (response.ok) setNextCursor(data.nextCursor)
    } catch { setResult('Preview failed. No notifications were sent.') }
    finally { setBusy(false) }
  }
  return <div className="grid max-w-xl gap-4">
    <h2>Prepare a notification</h2>
    <fieldset disabled={busy} className="grid min-w-0 gap-4">
      <label>Campaign key<ArchiveInput value={draft.campaignKey} maxLength={80} onChange={e => update('campaignKey', e.target.value)} /></label>
      <label>Title<ArchiveInput value={draft.title} maxLength={80} onChange={e => update('title', e.target.value)} /></label>
      <label>Message<ArchiveTextarea value={draft.body} maxLength={180} onChange={e => update('body', e.target.value)} /></label>
      <label>Console link<ArchiveInput value={draft.route} onChange={e => update('route', e.target.value)} /></label>
      <label>Recipient user IDs (up to 5 devices per batch)<ArchiveTextarea value={draft.recipients} onChange={e => update('recipients', e.target.value)} /></label>
    </fieldset>
    <ArchiveButton loading={busy} onClick={() => void preview()}>PREVIEW ONLY</ArchiveButton>
    {nextCursor && <ArchiveButton disabled={busy} variant="secondary" onClick={() => void preview(nextCursor)}>PREVIEW NEXT BATCH</ArchiveButton>}
    <p role="status">{result}</p>
  </div>
}
