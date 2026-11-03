'use client'

import { useState } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveInput, ArchiveTextarea } from '@/components/archive-input'

export function WebPushPreview() {
  const [campaignKey, setCampaignKey] = useState('voyager-invitation-draft')
  const [title, setTitle] = useState('Voyager is open')
  const [body, setBody] = useState('Take a look inside the Console. Your initiation begins here.')
  const [route, setRoute] = useState('/voyager-initiation?briefing=1')
  const [recipients, setRecipients] = useState('')
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  async function preview() {
    setBusy(true)
    try {
      const response = await fetch('/api/push/web/campaign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'preview', spec: { campaignKey, title, body, route, userIds: recipients.split(/[\s,]+/).filter(Boolean) } }) })
      const data = await response.json()
      setResult(response.ok ? `${data.eligibleUsers} users / ${data.eligibleDevices} devices eligible. Preview only; no notifications sent.` : data.error)
    } catch { setResult('Preview failed. No notifications were sent.') }
    finally { setBusy(false) }
  }
  return <div className="grid max-w-xl gap-4">
    <h2>Prepare a notification</h2>
    <label>Campaign key<ArchiveInput value={campaignKey} maxLength={80} onChange={e => setCampaignKey(e.target.value)} /></label>
    <label>Title<ArchiveInput value={title} maxLength={80} onChange={e => setTitle(e.target.value)} /></label>
    <label>Message<ArchiveTextarea value={body} maxLength={180} onChange={e => setBody(e.target.value)} /></label>
    <label>Console link<ArchiveInput value={route} onChange={e => setRoute(e.target.value)} /></label>
    <label>Recipient user IDs (up to 5 devices per batch)<ArchiveTextarea value={recipients} onChange={e => setRecipients(e.target.value)} /></label>
    <ArchiveButton loading={busy} onClick={preview}>PREVIEW ONLY</ArchiveButton>
    <p role="status">{result}</p>
  </div>
}
