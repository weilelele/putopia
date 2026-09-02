'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { createDeviceBatchDraft } from '@/lib/actions/device-batch-admin'
import {
  toBatchSlug,
  validateLocalBatchSeed,
  type LocalBatchSeed,
} from '@/lib/local-device-batches'
import styles from './new-batch.module.css'

const EMPTY_SEED: LocalBatchSeed = {
  code: '',
  leadName: '',
  location: '',
  name: '',
  slug: '',
  summary: '',
  updatedAt: '',
}

export function NewBatchForm({ reservedSlugs }: { reservedSlugs: string[] }) {
  const router = useRouter()
  const [form, setForm] = useState(EMPTY_SEED)
  const [slugTouched, setSlugTouched] = useState(false)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  function updateField(field: keyof LocalBatchSeed, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setMessage('')
  }

  function updateName(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug: slugTouched ? current.slug : toBatchSlug(value),
    }))
    setMessage('')
  }

  async function createDraft() {
    const [firstError] = validateLocalBatchSeed(form)
    if (firstError) {
      setMessage(firstError)
      return
    }
    if (reservedSlugs.includes(form.slug)) {
      setMessage('This slug is already used by a published Batch.')
      return
    }

    setSaving(true)
    const result = await createDeviceBatchDraft(form)
    setSaving(false)
    if (result.error || !result.slug) {
      setMessage(result.error ?? 'Batch could not be created.')
      return
    }

    router.push(`/admin/device-batches?batch=${encodeURIComponent(result.slug)}`)
  }

  return (
    <div className={styles.formLayout}>
      <div className={styles.formIntro}>
        <ArchiveLinkButton href="/admin/device-batches" variant="ghost">
          <ArrowLeft aria-hidden size={15} /> BACK TO BATCHES
        </ArchiveLinkButton>
        <div>
          <span>STEP 01</span>
          <h2>Batch identity</h2>
          <p>
            This creates a shared survey-stage draft with one placeholder Console Pack.
            It stays private until an Architect publishes it.
          </p>
        </div>
      </div>

      <section className={styles.formCard}>
        <div className={styles.twoColumnGrid}>
          <ArchiveField htmlFor="new-batch-name" label="BATCH NAME">
            <input
              id="new-batch-name"
              onChange={(event) => updateName(event.target.value)}
              placeholder="Lisbon Echo Array"
              value={form.name}
            />
          </ArchiveField>
          <ArchiveField htmlFor="new-batch-location" label="LOCATION">
            <input
              id="new-batch-location"
              onChange={(event) => updateField('location', event.target.value)}
              placeholder="Lisbon, Portugal"
              value={form.location}
            />
          </ArchiveField>
        </div>

        <div className={styles.twoColumnGrid}>
          <ArchiveField htmlFor="new-batch-code" label="BATCH CODE">
            <input
              id="new-batch-code"
              onChange={(event) => updateField('code', event.target.value.toUpperCase())}
              placeholder="LISBON-ECHO-03"
              value={form.code}
            />
          </ArchiveField>
          <ArchiveField htmlFor="new-batch-slug" label="URL SLUG">
            <input
              id="new-batch-slug"
              onChange={(event) => {
                setSlugTouched(true)
                updateField('slug', toBatchSlug(event.target.value))
              }}
              placeholder="lisbon-echo-03"
              value={form.slug}
            />
          </ArchiveField>
        </div>

        <div className={styles.twoColumnGrid}>
          <ArchiveField htmlFor="new-batch-lead" label="FIELD LEAD">
            <input
              id="new-batch-lead"
              onChange={(event) => updateField('leadName', event.target.value)}
              placeholder="Iris Vale"
              value={form.leadName}
            />
          </ArchiveField>
          <ArchiveField htmlFor="new-batch-date" label="FIRST RECORD DATE">
            <input
              id="new-batch-date"
              onChange={(event) => updateField('updatedAt', event.target.value)}
              placeholder="Jul 30, 2026"
              value={form.updatedAt}
            />
          </ArchiveField>
        </div>

        <ArchiveField htmlFor="new-batch-summary" label="INITIAL FIELD SUMMARY">
          <textarea
            id="new-batch-summary"
            onChange={(event) => updateField('summary', event.target.value)}
            placeholder="Describe what was found, what is confirmed, and what the team needs to verify next."
            rows={7}
            value={form.summary}
          />
        </ArchiveField>

        <div className={styles.formFooter}>
          <p>
            After creation, continue with Overview, Claim & Stock, Packs, and Latest
            Update.
          </p>
          <ArchiveButton disabled={saving} onClick={() => void createDraft()}>
            <Plus aria-hidden size={15} />
            {saving ? 'CREATING…' : 'CREATE SHARED DRAFT'}
          </ArchiveButton>
        </div>

        {message ? (
          <div className={styles.message} role="status">
            {message}
          </div>
        ) : null}
      </section>
    </div>
  )
}
