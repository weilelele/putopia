'use client'

import Image from 'next/image'
import { ArchiveInput, ArchiveSelect, ArchiveTextarea } from '@/components/archive-input'
import { useState } from 'react'
import { getUpdatePublicationState } from '@/lib/device-batch-content'
import { UpdateMedia } from '@/app/devices/_components/device-gallery'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import type { DeviceBatchMedia, DeviceBatchUpdate } from '@/lib/device-batches'
import { createDeviceMediaUpload } from '@/lib/actions/device-batch-admin'
import { createClient } from '@/lib/supabase/client'
import styles from './batch-config-editor.module.css'
import editorStyles from './update-editor.module.css'

export function UpdateEditor({ updates, publishedUpdates = [], onChange, onBusyChange }: {
  publishedUpdates?: DeviceBatchUpdate[]
  updates: DeviceBatchUpdate[]
  onChange: (updates: DeviceBatchUpdate[]) => void
  onBusyChange: (busy: boolean) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  function patch(id: string, change: Partial<DeviceBatchUpdate>) {
    onChange(updates.map((update) => update.id === id ? { ...update, ...change } : update))
  }
  async function upload(update: DeviceBatchUpdate, files: File[]) {
    if (!files.length) return
    setBusy(true)
    onBusyChange(true)
    setError('')
    const media = [...(update.media ?? [])]
    try {
      for (const file of files) {
        const result = await createDeviceMediaUpload({ type: file.type, size: file.size })
        if (result.error || !result.upload) throw new Error(result.error ?? 'Upload unavailable.')
        const { path, token, url } = result.upload
        const { error: uploadError } = await createClient().storage.from('device-update-media')
          .uploadToSignedUrl(path, token, file, { contentType: file.type })
        if (uploadError) throw new Error(uploadError.message)
        media.push({ kind: file.type.startsWith('video/') ? 'video' : 'image', src: url, alt: file.name, caption: file.name })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed. Try again.')
    } finally {
      patch(update.id, { media })
      setBusy(false)
      onBusyChange(false)
    }
  }
  function editPublished(update: DeviceBatchUpdate) {
    if (!updates.some((item) => item.id === update.id)) onChange([...updates, update])
    requestAnimationFrame(() => {
      const title = document.getElementById(`${update.id}-title`)
      title?.scrollIntoView({ block: 'center' })
      title?.focus({ preventScroll: true })
    })
  }
  return <div className={editorStyles.editor}>
    <section aria-label="Published updates" className={editorStyles.editor}>
      <h3>PUBLISHED UPDATES ({publishedUpdates.length})</h3>
      <p>This is the complete live list. Draft edits and removals appear here only after publishing.</p>
      {!publishedUpdates.length ? <p>No updates published yet.</p> : null}
      {publishedUpdates.map((update) => {
        const working = updates.find((item) => item.id === update.id)
        return <details key={update.id} className={editorStyles.publishedEntry}>
          <summary>{update.date} · {update.title}</summary>
          <p>{working ? getUpdatePublicationState(working, publishedUpdates) : 'REMOVAL PENDING'}</p>
          <p className={editorStyles.body}>{update.body}</p>
          <UpdateMedia media={update.media ?? []} />
          <ArchiveButton variant="secondary" disabled={busy} onClick={() => editPublished(update)}>
            {working ? 'EDIT UPDATE' : 'RESTORE TO WORKING LIST'}
          </ArchiveButton>
          {working ? <ArchiveButton variant="ghost" disabled={busy} onClick={() => onChange(updates.filter((item) => item.id !== update.id))}>REMOVE FROM WORKING LIST</ArchiveButton> : null}
        </details>
      })}
    </section>
    <h3>WORKING LIST ({updates.length})</h3>
    <ArchiveButton disabled={busy} onClick={() => onChange([
      { id: crypto.randomUUID(), date: new Intl.DateTimeFormat('en-CA').format(new Date()), title: '', body: '', media: [] }, ...updates,
    ])}>ADD UPDATE</ArchiveButton>
    <p>Newest updates appear first. Images and videos also appear in the device gallery. Uploaded files stay private to administrators until the update is published.</p>
    {updates.length === 0 ? <p>No updates in the working list. Add a report, or publish this empty list to remove all published updates.</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {updates.map((update, index) => <fieldset disabled={busy} key={update.id} className={editorStyles.entry}>
      <legend>UPDATE {index + 1} · {getUpdatePublicationState(update, publishedUpdates)}</legend>
      <div className={styles.secondaryActions}>
        <ArchiveButton variant="ghost" disabled={index === 0} onClick={() => {
          const next = [...updates]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next)
        }}>MOVE UP</ArchiveButton>
        <ArchiveButton variant="ghost" disabled={index === updates.length - 1} onClick={() => {
          const next = [...updates]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; onChange(next)
        }}>MOVE DOWN</ArchiveButton>
        <ArchiveButton variant="ghost" onClick={() => onChange(updates.filter((item) => item.id !== update.id))}>REMOVE UPDATE</ArchiveButton>
      </div>
      <ArchiveField htmlFor={`${update.id}-date`} label="DATE"><ArchiveInput id={`${update.id}-date`} value={update.date} onChange={(event) => patch(update.id, { date: event.target.value })} /></ArchiveField>
      <ArchiveField htmlFor={`${update.id}-title`} label="TITLE"><ArchiveInput id={`${update.id}-title`} value={update.title} onChange={(event) => patch(update.id, { title: event.target.value })} /></ArchiveField>
      <ArchiveField htmlFor={`${update.id}-body`} label="TEXT"><ArchiveTextarea id={`${update.id}-body`} rows={5} value={update.body} onChange={(event) => patch(update.id, { body: event.target.value })} /></ArchiveField>
      <ArchiveField htmlFor={`${update.id}-files`} label={busy ? 'UPLOADING…' : 'ADD IMAGES OR VIDEOS'}>
        <ArchiveInput id={`${update.id}-files`} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(event) => { void upload(update, Array.from(event.target.files ?? [])); event.target.value = '' }} />
      </ArchiveField>
      <p>JPEG, PNG, WebP, MP4 or WebM · up to 50 MB per file.</p>
      <ArchiveButton variant="secondary" onClick={() => patch(update.id, { media: [...(update.media ?? []), { kind: 'image', src: '', alt: '', caption: '' }] })}>ADD MEDIA BY URL</ArchiveButton>
      {update.media?.map((item, mediaIndex) => {
        const id = `${update.id}-media-${mediaIndex}`
        const edit = (change: Partial<DeviceBatchMedia>) => patch(update.id, { media: update.media?.map((entry, i) => i === mediaIndex ? { ...entry, ...change } : entry) })
        return <div className={editorStyles.mediaEntry} key={id}>
          {item.src && /^https:\/\/|^\/(?!\/)/.test(item.src) ? item.kind === 'video'
            ? <video src={item.src} poster={item.poster} controls preload="metadata" style={{ width: '100%', maxHeight: 240 }} />
            : <Image src={item.src} alt={item.alt} width={320} height={200} unoptimized style={{ width: '100%', maxHeight: 240, objectFit: 'contain' }} /> : null}
          <ArchiveField htmlFor={`${id}-kind`} label="TYPE"><ArchiveSelect id={`${id}-kind`} value={item.kind} onChange={(event) => edit({ kind: event.target.value as DeviceBatchMedia['kind'] })}><option value="image">Image</option><option value="video">Video</option></ArchiveSelect></ArchiveField>
          <ArchiveField htmlFor={`${id}-url`} label="MEDIA URL"><ArchiveInput id={`${id}-url`} value={item.src} onChange={(event) => edit({ src: event.target.value })} /></ArchiveField>
          <ArchiveField htmlFor={`${id}-caption`} label="CAPTION"><ArchiveInput id={`${id}-caption`} value={item.caption} onChange={(event) => edit({ caption: event.target.value })} /></ArchiveField>
          <ArchiveField htmlFor={`${id}-alt`} label="IMAGE DESCRIPTION"><ArchiveInput id={`${id}-alt`} value={item.alt} onChange={(event) => edit({ alt: event.target.value })} /></ArchiveField>
          {item.kind === 'video' ? <ArchiveField htmlFor={`${id}-poster`} label="VIDEO COVER URL (OPTIONAL)"><ArchiveInput id={`${id}-poster`} value={item.poster ?? ''} onChange={(event) => edit({ poster: event.target.value })} /></ArchiveField> : null}
          <ArchiveButton variant="secondary" onClick={() => patch(update.id, { media: update.media?.filter((_, i) => i !== mediaIndex) })}>REMOVE MEDIA</ArchiveButton>
        </div>
      })}
    </fieldset>)}
  </div>
}
