'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { ArchiveTabs } from '@/components/archive-tabs'
import { setDreamcatcherPublication } from '@/lib/actions/dreamcatcher-admin'
import type { DreamcatcherPublicationRecord } from '@/lib/dreamcatcher-publication'
import styles from './dreamcatchers.module.css'
import { DreamcatcherEditor } from './dreamcatcher-editor'

export function DreamcatcherManager({ records }: { records: DreamcatcherPublicationRecord[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [confirm, setConfirm] = useState<DreamcatcherPublicationRecord | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const [editor, setEditor] = useState<DreamcatcherPublicationRecord | 'new' | null>(null)
  const online = records.filter((item) => item.is_public).length
  const visible = records.filter((item) => filter === 'all' || item.is_public === (filter === 'online'))

  function applyChange() {
    if (!confirm || pending) return
    const record = confirm
    setError('')
    setMessage('')
    startTransition(async () => {
      try {
        const result = await setDreamcatcherPublication({ id: record.id, expectedIsPublic: record.is_public, isPublic: !record.is_public })
        if (result.error) {
          setError(result.error)
          return
        }
        setConfirm(null)
        setMessage(`${record.name} is now ${record.is_public ? 'unpublished' : 'published'}.`)
        router.refresh()
      } catch {
        setError('Connection interrupted. Refresh to check the current status before trying again.')
      }
    })
  }

  if (editor) return <DreamcatcherEditor key={editor === 'new' ? 'new' : editor.id} record={editor === 'new' ? null : editor} onCancel={() => setEditor(null)} onSaved={(notice) => {
    setEditor(null)
    setMessage(notice)
    setFilter('all')
    router.refresh()
  }} />

  return (
    <div className={styles.page}>
      <ArchivePageHeader title="DREAMCATCHERS" />
      <p className={styles.intro}>Publish devices to Worlds, or hide them without deleting their records.</p>
      <p className={styles.notice}>Preview changes also affect live data.</p>
      <div className={styles.toolbar}>
        <ArchiveButton disabled={pending} variant={confirm ? 'secondary' : 'primary'} onClick={() => { setConfirm(null); setError(''); setMessage(''); setEditor('new') }}>NEW DREAMCATCHER</ArchiveButton>
        <ArchiveButton disabled={pending} variant="ghost" onClick={() => { setConfirm(null); setError(''); router.refresh() }}>REFRESH</ArchiveButton>
      </div>
      <ArchiveTabs activeId={filter} ariaLabel="Publication status" items={[
        { id: 'all', label: 'ALL', count: records.length },
        { id: 'online', label: 'PUBLISHED', count: online },
        { id: 'offline', label: 'UNPUBLISHED', count: records.length - online },
      ]} onChange={(id) => { if (!pending) { setFilter(id); setConfirm(null); setError('') } }} />
      {message && <p role="status" className={styles.notice}>{message}</p>}
      <div className={styles.list}>
        {visible.map((record) => (
          <ArchiveCard key={record.id} className={styles.card}>
            <div className={styles.identity}>
              <div><h2>{record.name}</h2><p>{record.location}</p></div>
              <span className={styles.badge} data-published={record.is_public}>{record.is_public ? 'PUBLISHED' : 'UNPUBLISHED'}</span>
            </div>
            <dl className={styles.facts}>
              <div><dt>DEVICE</dt><dd>{record.code}</dd></div>
              <div><dt>RUNNING STATE</dt><dd>{record.status.replaceAll('_', ' ').toUpperCase()}</dd></div>
              <div><dt>ROUND</dt><dd>{record.round_duration_minutes} MIN</dd></div>
              <div><dt>WAITING CAPACITY</dt><dd>{record.queue_capacity}</dd></div>
            </dl>
            {confirm?.id === record.id ? (
              <section aria-label={`Confirm publication change for ${record.name}`} className={styles.confirm}>
                <h3>{confirm.is_public ? 'Unpublish this device?' : 'Publish this device?'}</h3>
                <p>{confirm.is_public
                  ? 'It will disappear from Worlds and stop accepting new dreams. Queued dreams stay on this device; no new rounds start until it is republished. A running round and already-published votes can still finish. Existing world records are not deleted.'
                  : 'It will appear in Worlds again. Its running state is preserved; eligible queued dreams can continue on this same device.'}</p>
                {error && <p role="alert">{error}</p>}
                <div className={styles.actions}>
                  <ArchiveButton disabled={pending} onClick={applyChange}>{pending ? 'SAVING…' : confirm.is_public ? 'CONFIRM UNPUBLISH' : 'CONFIRM PUBLISH'}</ArchiveButton>
                  <ArchiveButton disabled={pending} variant="secondary" onClick={() => { setConfirm(null); setError('') }}>CANCEL</ArchiveButton>
                  {error && <ArchiveButton variant="ghost" onClick={() => { setConfirm(null); setError(''); router.refresh() }}>REFRESH</ArchiveButton>}
                </div>
              </section>
            ) : (
              <div className={styles.actions}>
                <ArchiveButton disabled={pending} variant="secondary" onClick={() => { setConfirm(null); setError(''); setMessage(''); setEditor(record) }}>EDIT</ArchiveButton>
                <ArchiveButton disabled={pending} variant="secondary" onClick={() => { setConfirm(record); setError(''); setMessage('') }}>{record.is_public ? 'UNPUBLISH' : 'PUBLISH'}</ArchiveButton>
              </div>
            )}
          </ArchiveCard>
        ))}
        {!visible.length && <ArchiveCard className={styles.card}><p>{records.length ? 'No devices in this view.' : 'No Dreamcatchers have been created yet.'}</p></ArchiveCard>}
      </div>
    </div>
  )
}
