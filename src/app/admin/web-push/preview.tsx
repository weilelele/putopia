'use client'

import { useState } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveInput, ArchiveTextarea } from '@/components/archive-input'

type CampaignSpec = {
  campaignKey: string
  title: string
  body: string
  route: string
  userIds: string[]
}

type PreviewedBatch = {
  spec: CampaignSpec
  cursor?: string
  eligibleDevices: number
  sendingEnabled: boolean
}

const deliveryStatuses = [
  ['provider_accepted', 'Accepted by push provider'],
  ['accepted_log_unconfirmed', 'Accepted, receipt unconfirmed'],
  ['failed', 'Failed'],
  ['skipped', 'Skipped after eligibility recheck'],
  ['duplicate_skipped', 'Duplicate skipped'],
] as const

export function WebPushPreview() {
  const [draft, setDraft] = useState({ campaignKey: 'voyager-invitation-draft', title: 'Voyager is open', body: 'Take a look inside the Console. Your initiation begins here.', route: '/voyager-initiation?briefing=1', recipients: '' })
  const [result, setResult] = useState('')
  const [operation, setOperation] = useState<'preview' | 'send' | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [batch, setBatch] = useState<PreviewedBatch | null>(null)
  const [confirmation, setConfirmation] = useState('')

  function update(field: keyof typeof draft, value: string) {
    setDraft(previous => ({ ...previous, [field]: value }))
    setNextCursor(null)
    setBatch(null)
    setConfirmation('')
    setResult('')
  }

  async function preview(cursor?: string) {
    setOperation('preview')
    setNextCursor(null)
    setBatch(null)
    setConfirmation('')
    setResult('')
    try {
      const { recipients, ...message } = draft
      const spec = { ...message, userIds: recipients.split(/[\s,]+/).filter(Boolean) }
      const response = await fetch('/api/push/web/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', cursor, spec }),
      })
      const data = await response.json()
      if (!response.ok) {
        setResult(data.error || 'Preview failed. No notifications were sent.')
        return
      }
      setResult(`${data.eligibleUsers} users / ${data.eligibleDevices} devices in this batch. ${data.nextCursor ? 'More devices remain.' : 'No more devices remain.'} No notifications sent.`)
      setNextCursor(data.nextCursor)
      setBatch({ spec, cursor, eligibleDevices: data.eligibleDevices, sendingEnabled: data.dryRun === true && data.sendingEnabled === true })
    } catch {
      setResult('Preview failed. No notifications were sent.')
    } finally {
      setOperation(null)
    }
  }

  async function send() {
    if (operation || !batch?.sendingEnabled || !(batch.eligibleDevices > 0) || confirmation !== batch.spec.campaignKey) return
    setOperation('send')
    setBatch(null)
    setConfirmation('')
    setNextCursor(null)
    setResult('Sending the current batch…')
    try {
      const response = await fetch('/api/push/web/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', cursor: batch.cursor, spec: batch.spec, confirm: confirmation }),
      })
      const data = await response.json()
      if (!response.ok || !Array.isArray(data.results)) {
        setResult(`${data.error || 'Send could not be confirmed.'} Check delivery records before trying again.`)
        return
      }
      const results: { status: string }[] = data.results
      const counts = deliveryStatuses.map(([status, label]) => `${label}: ${results.filter(item => item.status === status).length}`)
      setResult(`${counts.join(' · ')}. Provider acceptance does not confirm display on the device.`)
      setNextCursor(data.nextCursor)
    } catch {
      setResult('Send could not be confirmed. Check delivery records before trying again.')
    } finally {
      setOperation(null)
    }
  }

  const busy = operation !== null
  return <div className="grid max-w-xl gap-4">
    <h2>Prepare a notification</h2>
    <fieldset disabled={busy} className="grid min-w-0 gap-4">
      <label>Campaign key<ArchiveInput value={draft.campaignKey} maxLength={80} onChange={e => update('campaignKey', e.target.value)} /></label>
      <label>Title<ArchiveInput value={draft.title} maxLength={80} onChange={e => update('title', e.target.value)} /></label>
      <label>Message<ArchiveTextarea value={draft.body} maxLength={180} onChange={e => update('body', e.target.value)} /></label>
      <label>Console link<ArchiveInput value={draft.route} onChange={e => update('route', e.target.value)} /></label>
      <label>Recipient user IDs (up to 5 devices per batch)<ArchiveTextarea value={draft.recipients} onChange={e => update('recipients', e.target.value)} /></label>
    </fieldset>
    <ArchiveButton disabled={busy} loading={operation === 'preview'} onClick={() => void preview()}>PREVIEW ONLY</ArchiveButton>
    {nextCursor && <ArchiveButton disabled={busy} variant="secondary" onClick={() => void preview(nextCursor)}>PREVIEW NEXT BATCH</ArchiveButton>}
    <p role="status">{result}</p>
    {batch && !batch.sendingEnabled && <p>Real sending is locked by the server.</p>}
    {batch?.sendingEnabled && batch.eligibleDevices > 0 && <fieldset className="grid min-w-0 gap-4">
      <legend>Send the current batch</legend>
      <p>Up to {batch.eligibleDevices} devices were eligible in the preview. Sending checks current eligibility again.</p>
      <label>Type the exact campaign key <code>{batch.spec.campaignKey}</code> to confirm
        <ArchiveInput value={confirmation} maxLength={80} autoComplete="off" spellCheck={false} onChange={e => setConfirmation(e.target.value)} />
      </label>
      <ArchiveButton variant="destructive" disabled={busy || confirmation !== batch.spec.campaignKey} onClick={() => void send()}>SEND THIS BATCH</ArchiveButton>
    </fieldset>}
  </div>
}
