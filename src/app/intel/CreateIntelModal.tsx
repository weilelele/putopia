'use client'

import { ArchiveInput, ArchiveSelect, ArchiveTextarea } from '@/components/archive-input'
import { useState, useRef } from 'react'
import { createIntel } from '@/lib/actions/intel'
import { createClient } from '@/lib/supabase/client'
import type { Intel, IntelTag } from '@/types/database'
import { MemberPicker, type MemberValue } from '@/components/member-picker'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveSheet } from '@/components/archive-sheet'
import { ArchiveField } from '@/components/archive-field'
import { toLocalDateTime, validateNoticeTiming } from '@/lib/intel-notice'
import { INTEL_MEDIA_BUCKET, INTEL_VIDEO_TYPE, validateIntelVideoFile } from '@/lib/intel-media'

type Props = {
  onClose: () => void
  onCreated: () => void
  existingItems: Intel[]
}

type F = {
  id: string
  title: string
  content: string
  timestamp: string
  expires_at: string
  tag: IntelTag
  classified: boolean
  publisher_name: string
  publisher_id: string | null
}

function nextIntelId(items: Intel[]) {
  const nums = items.map(i => parseInt(i.id.replace('INT-', ''))).filter(n => !isNaN(n))
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `INT-${String(next).padStart(6, '0')}`
}

export function CreateIntelModal({ onClose, onCreated, existingItems }: Props) {
  const autoId = nextIntelId(existingItems)

  const [form, setForm] = useState<F>({
    id: '', title: '', content: '',
    timestamp: toLocalDateTime(new Date().toISOString()), expires_at: '',
    tag: 'NOTICE', classified: false,
    publisher_name: '', publisher_id: null,
  })
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [previews, setPreviews]         = useState<string[]>([])
  const [uncertain, setUncertain] = useState(false)
  const [saving, setSaving]             = useState(false)
  const [uploading, setUploading]       = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [videoFile, setVideoFile]       = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoError, setVideoError]     = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)

  const set = (k: keyof F, v: string | boolean | null) => setForm(f => ({ ...f, [k]: v }))
  const setPublisher = (v: MemberValue) => setForm(f => ({ ...f, publisher_id: v?.id ?? null, publisher_name: v?.name ?? '' }))

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setPendingFiles(prev => [...prev, ...files])
    setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
    e.target.value = ''
  }

  const removePending = (idx: number) => {
    URL.revokeObjectURL(previews[idx])
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const invalid = validateIntelVideoFile(file)
    if (invalid) { setVideoError(invalid); return }
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setVideoError(null)
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
  }

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setVideoFile(null); setVideoPreview(null); setVideoError(null)
  }

  // The preview decodes the file in this browser; one it cannot play is rejected here.
  const rejectUnplayableVideo = () => {
    removeVideo()
    setVideoError('This video cannot be played. Export it as MP4 with H.264 video and AAC audio.')
  }

  // The cover is the frame the publisher paused the preview on; an untouched
  // preview has only metadata loaded, so it first seeks to one second in.
  const captureVideoCover = async (): Promise<Blob | null> => {
    const video = videoPreviewRef.current
    if (!video || !video.videoWidth) return null
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await new Promise<void>(resolve => {
        video.addEventListener('seeked', () => resolve(), { once: true })
        setTimeout(resolve, 3000)
        video.currentTime = Math.min(1, video.duration / 2 || 0)
      })
    }
    const scale = Math.min(1, 1280 / video.videoWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.86))
  }

  const uploadToIntel = async (intelId: string, file: Blob, ext: string, contentType?: string) => {
    const supabase = createClient()
    const path = `${intelId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: uploadErr } = await supabase.storage.from(INTEL_MEDIA_BUCKET).upload(path, file, contentType ? { contentType } : undefined)
    if (uploadErr) throw new Error('Upload failed')
    return supabase.storage.from(INTEL_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
  }

  const uploadPendingFiles = async (intelId: string): Promise<string[]> => {
    const urls: string[] = []
    for (const file of pendingFiles) urls.push(await uploadToIntel(intelId, file, file.name.split('.').pop() ?? 'jpg'))
    return urls
  }

  const uploadVideo = async (intelId: string) => {
    if (!videoFile) return {}
    const cover = await captureVideoCover()
    const video_url = await uploadToIntel(intelId, videoFile, 'mp4', INTEL_VIDEO_TYPE)
    const video_poster_url = cover ? await uploadToIntel(intelId, cover, 'jpg', 'image/jpeg') : null
    return { video_url, video_poster_url }
  }

  const handleSave = async () => {
    if (saving || uncertain) return
    if (!form.title.trim()) { setError('Title is required.'); return }
    const validation = validateNoticeTiming(form)
    if (validation) { setError(validation); return }
    const id = form.id.trim() || autoId
    setSaving(true); setUploading(pendingFiles.length > 0 || !!videoFile); setError(null)

    let submitted = false
    try {
    const newUrls = await uploadPendingFiles(id)
    const video = await uploadVideo(id)
    setUploading(false)

    submitted = true
    const result = await createIntel({
      id,
      title:          form.title.trim(),
      content:        form.content.trim(),
      timestamp:      new Date(form.timestamp).toISOString(),
      tag:            form.tag,
      expires_at:     form.tag === 'NOTICE' ? new Date(form.expires_at).toISOString() : null,
      classified:     form.classified,
      images:         newUrls,
      ...video,
      publisher_name: form.publisher_name.trim() || null,
      publisher_id:   form.publisher_id,
      created_by:     null,
    })

    setSaving(false)
    if (result?.error) { setError(result.error); return }
    onCreated()
    } catch {
      setUncertain(submitted)
      setError(submitted ? 'Result unconfirmed. Check the Intel archive before submitting again.' : 'Attachments could not be uploaded. Your draft is still here; retry the upload.')
    } finally { setSaving(false); setUploading(false) }
  }

  return (
    <ArchiveSheet open title="Publish Intel" onClose={onClose} busy={saving} dirty={!uncertain && (!!form.title || !!form.content || !!form.expires_at || !!form.publisher_name || pendingFiles.length > 0 || !!videoFile)}>
        {/* Header */}


        {/* ID and type share a row on wide screens; dates retain full width. */}
        <div className="archive-modal-grid archive-modal-grid--two">
          <ArchiveField htmlFor="intel-id" label="ID · OPTIONAL">
            <ArchiveInput id="intel-id" value={form.id} onChange={e => set('id', e.target.value)} placeholder={autoId} />
          </ArchiveField>
          <ArchiveField htmlFor="intel-type" label="TYPE">
            <ArchiveSelect id="intel-type" value={form.tag} onChange={e => set('tag', e.target.value as IntelTag)}>
              <option value="NOTICE">NOTICE — Task</option>
              <option value="DEVICE">DEVICE — Device</option>
              <option value="ORG">ORG — Organization</option>
            </ArchiveSelect>
          </ArchiveField>
        </div>

        <ArchiveField htmlFor="intel-timestamp" label="TIMESTAMP">
          <ArchiveInput id="intel-timestamp" type="datetime-local" value={form.timestamp} onChange={e => set('timestamp', e.target.value)} />
        </ArchiveField>

        {form.tag === 'NOTICE' && (
          <ArchiveField htmlFor="intel-expires-at" label="TASK EXPIRY *" helpText="Use your local time. At this time the task ends; the notice remains available as history.">
            <ArchiveInput id="intel-expires-at" type="datetime-local" required value={form.expires_at} onChange={e => set('expires_at', e.target.value)} />
          </ArchiveField>
        )}

        {/* Title */}
        <ArchiveField htmlFor="intel-title" label="TITLE *">
          <ArchiveInput id="intel-title" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Intelligence title" />
        </ArchiveField>

        {/* Content */}
        <ArchiveField htmlFor="intel-content" label="CONTENT">
          <ArchiveTextarea
            id="intel-content"
            value={form.content}
            onChange={e => set('content', e.target.value)}
            placeholder="Intelligence details..."
          />
        </ArchiveField>

        {/* Publisher */}
        <div style={{ marginBottom: '16px' }}>
          <MemberPicker
            scope="npcs"
            label="PUBLISHER NPC (OPTIONAL)"
            value={form.publisher_id ? { id: form.publisher_id, name: form.publisher_name } : null}
            onChange={setPublisher}
          />
        </div>

        {/* Image attachments */}
        <div style={{ marginBottom: '16px' }}>
          <div className="archive-field__label">IMAGE ATTACHMENTS</div>

          {previews.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {previews.map((url, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', border: '1px solid #C84406', opacity: 0.8 }} />
                  <ArchiveButton type="submit" variant="ghost"
                    aria-label={`Remove image ${idx + 1}`}
                    onClick={() => removePending(idx)}
                    style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >×</ArchiveButton>
                  <div style={{ position: 'absolute', bottom: '2px', left: '2px', background: 'rgba(200,68,6,0.85)', color: '#fff', fontSize: 'var(--fs-caption)', padding: '1px 3px', fontFamily: 'var(--font-mono)' }}>PENDING</div>
                </div>
              ))}
            </div>
          )}

          <ArchiveInput ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
          <ArchiveButton
            type="button"
            onClick={() => fileInputRef.current?.click()}
            variant="secondary"
          >
            SELECT IMAGES
          </ArchiveButton>
          <span style={{ marginLeft: '10px', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)' }}>
            {pendingFiles.length > 0 ? `${pendingFiles.length} file(s) selected` : 'No files selected'}
          </span>
        </div>

        {/* Video attachment */}
        <div style={{ marginBottom: '16px' }}>
          <div className="archive-field__label">VIDEO ATTACHMENT</div>
          {videoPreview && (
            <div style={{ marginBottom: '10px' }}>
              <video
                ref={videoPreviewRef}
                src={videoPreview}
                controls
                playsInline
                preload="metadata"
                aria-label="Video preview"
                onError={rejectUnplayableVideo}
                onLoadedMetadata={e => { if (!e.currentTarget.videoWidth) rejectUnplayableVideo() }}
                style={{ display: 'block', width: '100%', aspectRatio: '16/9', background: 'var(--color-deep)', border: '1px solid var(--bd-faint)' }}
              />
              <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)' }}>
                Pause on the frame to use as the cover.
              </p>
            </div>
          )}
          <ArchiveInput ref={videoInputRef} type="file" accept="video/mp4,.mp4" onChange={handleVideoSelect} style={{ display: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <ArchiveButton type="button" variant="secondary" onClick={() => videoInputRef.current?.click()}>
              {videoFile ? 'REPLACE VIDEO' : 'SELECT VIDEO'}
            </ArchiveButton>
            {videoFile && <ArchiveButton type="button" variant="ghost" onClick={removeVideo}>Remove video</ArchiveButton>}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)', overflowWrap: 'anywhere' }}>
              {videoFile ? `${videoFile.name} · ${(videoFile.size / 1024 / 1024).toFixed(1)} MB` : 'MP4 · H.264/AAC · up to 50 MB'}
            </span>
          </div>
          {videoError && <div role="alert" style={{ marginTop: '8px', color: 'var(--color-fault)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)' }}>✗ {videoError}</div>}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', paddingTop: '16px', borderTop: '1px solid rgba(227,82,5,0.16)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#E83030', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)' }}>
            <ArchiveInput type="checkbox" checked={form.classified} onChange={e => set('classified', e.target.checked)} />
            CLASSIFIED (Voyager+ only)
          </label>
          <div style={{ flex: 1 }} />
          {error && (
            <div style={{ color: '#C84406', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)' }}>✗ {error}</div>
          )}
          <ArchiveButton
            type="button"
            onClick={handleSave}
            disabled={saving || uncertain}
            variant="primary"
          >
            {uploading ? 'UPLOADING...' : saving ? 'SAVING...' : 'PUBLISH'}
          </ArchiveButton>
        </div>
      </ArchiveSheet>
  )
}
