'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveField } from '@/components/archive-field'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { saveDreamcatcher } from '@/lib/actions/dreamcatcher-admin'
import { dreamcatcherConfig, EMPTY_DREAMCATCHER, validateDreamcatcherConfig, type DreamcatcherConfig } from '@/lib/dreamcatcher-config'
import type { DreamcatcherPublicationRecord } from '@/lib/dreamcatcher-publication'
import styles from './dreamcatchers.module.css'

const IDENTITY_FIELDS = [
  { key: 'name', label: 'NAME', placeholder: 'Kyoto Dreamcatcher', max: 160 },
  { key: 'slug', label: 'DEVICE ID', placeholder: 'kyoto-02', max: 80 },
  { key: 'code', label: 'DEVICE CODE', placeholder: 'DC-KYO-02', max: 40 },
] as const
const LOCATION_FIELDS = [
  { key: 'city', label: 'CITY / TAB LABEL', placeholder: 'Kyoto', max: 120 },
  { key: 'country', label: 'COUNTRY / REGION', placeholder: 'Japan', max: 120 },
  { key: 'location', label: 'DISPLAY LOCATION', placeholder: 'Kyoto, Japan', max: 240 },
  { key: 'time_zone', label: 'TIME ZONE', placeholder: 'Asia/Tokyo', max: 80 },
] as const

export function DreamcatcherEditor({ record, onCancel, onSaved }: {
  record: DreamcatcherPublicationRecord | null
  onCancel: () => void
  onSaved: (message: string) => void
}) {
  const initial = record ? dreamcatcherConfig(record) : EMPTY_DREAMCATCHER
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [discardPrompt, setDiscardPrompt] = useState(false)
  const [pending, startTransition] = useTransition()

  function cancel() {
    if (dirty) setDiscardPrompt(true)
    else onCancel()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || discardPrompt) return
    const form = new FormData(event.currentTarget)
    const config: DreamcatcherConfig = {
      slug: String(form.get('slug') ?? ''), code: String(form.get('code') ?? ''),
      name: String(form.get('name') ?? ''), city: String(form.get('city') ?? ''),
      country: String(form.get('country') ?? ''), location: String(form.get('location') ?? ''),
      time_zone: String(form.get('time_zone') ?? ''),
      round_duration_minutes: Number(form.get('round_duration_minutes')),
      queue_capacity: Number(form.get('queue_capacity')),
    }
    const validation = validateDreamcatcherConfig(config)
    if (validation) { setError(validation); return }
    setError('')
    startTransition(async () => {
      try {
        const result = await saveDreamcatcher(record
          ? { mode: 'edit', id: record.id, config, expected: initial }
          : { mode: 'create', config })
        if (result.error) { setError(result.error); return }
        onSaved(record ? `${config.name.trim()} saved.` : `${config.name.trim()} created as unpublished. Publish it when ready.`)
      } catch {
        setError('Connection interrupted. Check the device list before retrying; your save may have completed.')
      }
    })
  }

  return (
    <div className={styles.page}>
      <ArchivePageHeader title={record ? 'EDIT DREAMCATCHER' : 'NEW DREAMCATCHER'} />
      <p className={styles.notice}>{record
        ? record.is_public ? 'This device is published. Saving updates its live details immediately.' : 'Saving keeps this device unpublished.'
        : 'New devices are unpublished. Review the details, then publish separately.'}</p>
      <ArchiveCard className={styles.card}>
        <form className={styles.form} onChange={() => setDirty(true)} onSubmit={submit} aria-label={record ? 'Edit Dreamcatcher' : 'New Dreamcatcher'}>
          <fieldset disabled={pending} className={styles.fieldGroup}>
            <legend>IDENTITY</legend>
            <div className={styles.formGrid}>
              {IDENTITY_FIELDS.map((field) => <ArchiveField key={field.key} htmlFor={`dc-${field.key}`} label={field.label}>
                <input id={`dc-${field.key}`} name={field.key} defaultValue={initial[field.key]} placeholder={field.placeholder} maxLength={field.max} required readOnly={!!record && field.key === 'slug'} />
              </ArchiveField>)}
            </div>
            <p className={styles.notice}>Device ID is unique and permanent. Existing dreams stay linked to this device.</p>
          </fieldset>
          <fieldset disabled={pending} className={styles.fieldGroup}>
            <legend>LOCATION</legend>
            <div className={styles.formGrid}>
              {LOCATION_FIELDS.map((field) => <ArchiveField key={field.key} htmlFor={`dc-${field.key}`} label={field.label}>
                <input id={`dc-${field.key}`} name={field.key} defaultValue={initial[field.key]} placeholder={field.placeholder} maxLength={field.max} required list={field.key === 'time_zone' ? 'dreamcatcher-time-zones' : undefined} />
              </ArchiveField>)}
            </div>
            <datalist id="dreamcatcher-time-zones">{['UTC', 'Asia/Tokyo', 'Asia/Shanghai', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'America/Mexico_City', 'Australia/Sydney'].map((zone) => <option value={zone} key={zone} />)}</datalist>
            <p className={styles.notice}>Time zone controls the local clock shown in Worlds.</p>
          </fieldset>
          <fieldset disabled={pending} className={styles.fieldGroup}>
            <legend>PROCESSING</legend>
            <div className={styles.formGrid}>
              <ArchiveField htmlFor="dc-round" label="MINUTES PER ROUND"><select id="dc-round" name="round_duration_minutes" defaultValue={initial.round_duration_minutes}>{[8, 9, 10].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></ArchiveField>
              <ArchiveField htmlFor="dc-capacity" label="WAITING CAPACITY"><input id="dc-capacity" name="queue_capacity" type="number" inputMode="numeric" min={1} max={500} step={1} required defaultValue={initial.queue_capacity} /></ArchiveField>
            </div>
            <p className={styles.notice}>One dream is processed at a time. Duration changes apply to future rounds. Lowering capacity does not remove queued dreams; new submissions wait until there is room.</p>
          </fieldset>
          {error && <p role="alert" className={styles.formError}>{error}</p>}
          {discardPrompt ? <section aria-label="Unsaved changes" className={styles.confirm}>
            <h3>Discard unsaved changes?</h3>
            <p>Your changes have not been saved.</p>
            <div className={styles.actions}>
              <ArchiveButton onClick={() => setDiscardPrompt(false)}>KEEP EDITING</ArchiveButton>
              <ArchiveButton variant="secondary" onClick={onCancel}>DISCARD CHANGES</ArchiveButton>
            </div>
          </section> : <div className={styles.actions}>
            <ArchiveButton type="submit" disabled={pending || (!!record && !dirty)}>{pending ? 'SAVING…' : record ? 'SAVE CHANGES' : 'CREATE UNPUBLISHED'}</ArchiveButton>
            <ArchiveButton variant="secondary" disabled={pending} onClick={cancel}>CANCEL</ArchiveButton>
          </div>}
        </form>
      </ArchiveCard>
    </div>
  )
}
