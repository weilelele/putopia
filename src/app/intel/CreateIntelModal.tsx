'use client'

import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { createIntel } from '@/lib/actions/intel'
import { createClient } from '@/lib/supabase/client'
import type { Intel, IntelTag } from '@/types/database'
import { MemberPicker, type MemberValue } from '@/components/member-picker'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveField } from '@/components/archive-field'

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
    timestamp: new Date().toISOString().slice(0, 16),
    tag: 'NOTICE', classified: false,
    publisher_name: '', publisher_id: null,
  })
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [previews, setPreviews]         = useState<string[]>([])
  const [saving, setSaving]             = useState(false)
  const [uploading, setUploading]       = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const uploadPendingFiles = async (intelId: string): Promise<string[]> => {
    const supabase = createClient()
    const urls: string[] = []
    for (const file of pendingFiles) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${intelId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('intel-images').upload(path, file)
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage.from('intel-images').getPublicUrl(path)
        urls.push(publicUrl)
      }
    }
    return urls
  }

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return }
    const id = form.id.trim() || autoId
    setSaving(true); setUploading(pendingFiles.length > 0); setError(null)

    const newUrls = await uploadPendingFiles(id)
    setUploading(false)

    const result = await createIntel({
      id,
      title:          form.title.trim(),
      content:        form.content.trim(),
      timestamp:      new Date(form.timestamp).toISOString(),
      tag:            form.tag,
      classified:     form.classified,
      images:         newUrls,
      publisher_name: form.publisher_name.trim() || null,
      publisher_id:   form.publisher_id,
      created_by:     null,
    })

    setSaving(false)
    if (result?.error) { setError(result.error); return }
    onCreated()
  }

  return (
    <div
      className="archive-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <ArchiveCard
        aria-labelledby="create-intel-title"
        aria-modal="true"
        className="archive-modal archive-intel-modal"
        role="dialog"
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div className="archive-modal__eyebrow">NEW INTEL · AUTO ID {autoId}</div>
            <h2 id="create-intel-title">PUBLISH INTEL</h2>
          </div>
          <ArchiveButton aria-label="Close dialog" onClick={onClose} variant="ghost">
            <X size={18} />
          </ArchiveButton>
        </div>

        {/* Row 1: ID / Type / Timestamp */}
        <div className="archive-modal-grid archive-modal-grid--three">
          <ArchiveField htmlFor="intel-id" label="ID · OPTIONAL">
            <input id="intel-id" value={form.id} onChange={e => set('id', e.target.value)} placeholder={autoId} />
          </ArchiveField>
          <ArchiveField htmlFor="intel-type" label="TYPE">
            <select id="intel-type" value={form.tag} onChange={e => set('tag', e.target.value as IntelTag)}>
              <option value="NOTICE">NOTICE — Notice</option>
              <option value="DEVICE">DEVICE — Device</option>
              <option value="ORG">ORG — Organization</option>
            </select>
          </ArchiveField>
          <ArchiveField htmlFor="intel-timestamp" label="TIMESTAMP">
            <input id="intel-timestamp" type="datetime-local" value={form.timestamp} onChange={e => set('timestamp', e.target.value)} />
          </ArchiveField>
        </div>

        {/* Title */}
        <ArchiveField htmlFor="intel-title" label="TITLE *">
          <input id="intel-title" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Intelligence title" />
        </ArchiveField>

        {/* Content */}
        <ArchiveField htmlFor="intel-content" label="CONTENT">
          <textarea
            id="intel-content"
            value={form.content}
            onChange={e => set('content', e.target.value)}
            placeholder="Intelligence details..."
          />
        </ArchiveField>

        {/* Publisher */}
        <div style={{ marginBottom: '16px' }}>
          <MemberPicker
            label="PUBLISHER"
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
                  <button
                    aria-label={`Remove image ${idx + 1}`}
                    onClick={() => removePending(idx)}
                    style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(232,48,48,0.85)', border: 'none', color: '#fff', width: '18px', height: '18px', cursor: 'pointer', fontSize: 'var(--fs-caption)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >×</button>
                  <div style={{ position: 'absolute', bottom: '2px', left: '2px', background: 'rgba(200,68,6,0.85)', color: '#fff', fontSize: 'var(--fs-caption)', padding: '1px 3px', fontFamily: 'monospace' }}>PENDING</div>
                </div>
              ))}
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
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

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', paddingTop: '16px', borderTop: '1px solid rgba(227,82,5,0.16)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#E83030', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)' }}>
            <input type="checkbox" checked={form.classified} onChange={e => set('classified', e.target.checked)} />
            CLASSIFIED (Voyager+ only)
          </label>
          <div style={{ flex: 1 }} />
          {error && (
            <div style={{ color: '#C84406', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)' }}>✗ {error}</div>
          )}
          <ArchiveButton
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            CANCEL
          </ArchiveButton>
          <ArchiveButton
            type="button"
            onClick={handleSave}
            disabled={saving}
            variant="primary"
          >
            {uploading ? 'UPLOADING...' : saving ? 'SAVING...' : 'PUBLISH'}
          </ArchiveButton>
        </div>
      </ArchiveCard>
    </div>
  )
}
