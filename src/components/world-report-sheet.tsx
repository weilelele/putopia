'use client'
import { useEffect, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { ArchiveSheet } from '@/components/archive-sheet'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchiveSelect, ArchiveTextarea } from '@/components/archive-input'
import { listImpersonatableProfiles } from '@/lib/actions/comments'
import { submitWorldReport } from '@/lib/actions/world-reports'
import type { ImpersonatableProfile } from '@/types/database'
import type { ReportKind } from '@/lib/world-reports'

const COPY: Record<ReportKind, { title: string; label: string; placeholder: string; submit: string }> = {
  observation: {
    title: 'Report observation',
    label: 'WHAT DID YOU SEE?',
    placeholder: 'Describe how this world looked on your device…',
    submit: 'REPORT OBSERVATION',
  },
  anomaly: {
    title: 'Report anomaly',
    label: 'WHAT HAPPENED?',
    placeholder: 'Describe the anomaly and how it interacted with you…',
    submit: 'REPORT ANOMALY',
  },
}
const MAX_IMAGES = 3

/**
 * Files an observation or anomaly report. The server re-checks the "has device"
 * status; architects may also file as an NPC (recorded for audit).
 */
export function WorldReportSheet({
  kind, open, onClose, worldId, worldName, canReport, onSubmitted,
}: {
  kind: ReportKind
  open: boolean
  onClose: () => void
  worldId: string
  worldName: string
  canReport: boolean | null
  onSubmitted?: () => void
}) {
  const copy = COPY[kind]
  const [body, setBody] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [asProfileId, setAsProfileId] = useState('')
  const [npcs, setNpcs] = useState<ImpersonatableProfile[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Non-architects get an empty list, which also tells us who may impersonate.
  useEffect(() => {
    let live = true
    listImpersonatableProfiles('world').then((list) => { if (live) setNpcs(list) }).catch(() => { if (live) setNpcs([]) })
    return () => { live = false }
  }, [])

  const mayImpersonate = (npcs?.length ?? 0) > 0
  const allowed = canReport || mayImpersonate
  const waiting = canReport === null || npcs === null

  async function addImage(file: File) {
    setUploading(true); setError('')
    try {
      const form = new FormData(); form.set('image', file)
      const res = await fetch('/api/comments/upload-image', { method: 'POST', body: form })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.url) setError(json.error ?? 'Image upload failed.')
      else setImages((prev) => [...prev, json.url])
    } catch { setError('Image upload failed — check your connection.') }
    finally { setUploading(false) }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const result = await submitWorldReport({ worldId, kind, body, imageUrls: images, asProfileId: asProfileId || null })
      if (result.error) { setError(result.error); return }
      setBody(''); setImages([]); onSubmitted?.(); onClose()
    } catch { setError('Result unconfirmed. Refresh to check before trying again.') }
    finally { setBusy(false) }
  }

  return (
    <ArchiveSheet open={open} onClose={onClose} title={copy.title} busy={busy} dirty={!busy && (!!body.trim() || images.length > 0)}>
      {!waiting && !allowed ? (
        <div className="worlds-gate">
          <p>Reports come from people who hold a device. Get a device to report what you observe in {worldName}.</p>
          <ArchiveLinkButton href="/devices" variant="primary">GET A DEVICE</ArchiveLinkButton>
        </div>
      ) : (
        <form className="worlds-report-form" onSubmit={submit}>
          <p className="worlds-report-form__world">{worldName}</p>
          {mayImpersonate && (
            <>
              <label htmlFor={`report-as-${kind}`}>POST AS</label>
              <ArchiveSelect id={`report-as-${kind}`} value={asProfileId} onChange={(e) => setAsProfileId(e.target.value)}>
                <option value="">Myself</option>
                {npcs?.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
              </ArchiveSelect>
            </>
          )}
          <label htmlFor={`report-${kind}`}>{copy.label}</label>
          <ArchiveTextarea id={`report-${kind}`} rows={5} minLength={10} maxLength={1000} value={body}
            onChange={(e) => setBody(e.target.value)} placeholder={copy.placeholder} />
          <div className="worlds-report-form__images">
            {images.map((url) => (
              <span key={url} className="worlds-report-form__thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Attached" />
                <button type="button" aria-label="Remove image" onClick={() => setImages((prev) => prev.filter((x) => x !== url))}><X size={14} /></button>
              </span>
            ))}
            {images.length < MAX_IMAGES && (
              <label className="worlds-report-form__add">
                <ImagePlus aria-hidden size={20} /><span>{uploading ? 'UPLOADING' : 'ADD IMAGE'}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={uploading}
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) void addImage(file); e.target.value = '' }} />
              </label>
            )}
          </div>
          {error && <p role="alert" className="worlds-report-form__note">{error}</p>}
          <ArchiveButton type="submit" variant="primary" fullWidth loading={busy} disabled={waiting || uploading || body.trim().length < 10}>
            {copy.submit}
          </ArchiveButton>
        </form>
      )}
    </ArchiveSheet>
  )
}
