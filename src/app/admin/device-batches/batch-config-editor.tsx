'use client'

import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveTabs } from '@/components/archive-tabs'
import { BatchCameraFields } from './batch-camera-fields'
import {
  saveDeviceBatchRecord,
} from '@/lib/actions/device-batch-admin'
import {
  sendBatchDistributionUpdate,
  sendBatchMajorUpdate,
} from '@/lib/actions/device-batch-notifications'
import {
  createBatchConfigDraft,
  normalizeBatchConfigDraft,
  type BatchConfigDraft,
  validateBatchConfigDraft,
} from '@/lib/device-batch-config-drafts'
import {
  DEVICE_BATCH_STATUS,
  DEVICE_BATCH_TIME_ZONE_OPTIONS,
  formatBatchPrice,
  type BatchInventory,
  type BatchPrice,
  type DeviceBatchMedia,
  type DistributionStage,
} from '@/lib/device-batches'
import type { AdminDeviceBatchRecord } from '@/lib/device-batch-repository'
import styles from './batch-config-editor.module.css'

const EMPTY_PRICE: BatchPrice = {
  amount: 0,
  currency: 'USD',
  description: '',
}

const EMPTY_INVENTORY: BatchInventory = {
  claimedQuantity: 0,
  listingQuantity: 0,
}

type WorkspaceTab = 'overview' | 'claim' | 'packs' | 'update'

function createStageId(stages: DistributionStage[]) {
  let index = stages.length + 1
  while (stages.some((stage) => stage.id === `pack-${index}`)) index += 1
  return `pack-${index}`
}

function getRemainingQuantity(inventory?: BatchInventory) {
  if (!inventory) return 0
  return Math.max(inventory.listingQuantity - inventory.claimedQuantity, 0)
}

function parseMediaLines(value: string): DeviceBatchMedia[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((part) => part.trim())
      const explicitKind = parts[0] === 'image' || parts[0] === 'video'
      const src = explicitKind ? parts[1] ?? '' : parts[0] ?? ''
      const kind = explicitKind
        ? (parts[0] as DeviceBatchMedia['kind'])
        : /\.(mp4|webm)(\?|$)/i.test(src)
          ? 'video'
          : 'image'
      return {
        kind,
        src,
        caption: parts[explicitKind ? 2 : 1] || 'Field media',
        alt: parts[explicitKind ? 3 : 2] || 'Batch field record',
        ...(kind === 'video' && parts[4] ? { poster: parts[4] } : {}),
      }
    })
    .filter((item) => item.src)
}

function formatMediaLines(items?: DeviceBatchMedia[]) {
  return (items ?? [])
    .map((item) =>
      [
        item.kind,
        item.src,
        item.caption,
        item.alt,
        item.poster ?? '',
      ].join(' | '),
    )
    .join('\n')
}

export function BatchConfigEditor({
  records,
  initialSlug,
}: {
  records: AdminDeviceBatchRecord[]
  initialSlug?: string
}) {
  const [serverRecords, setServerRecords] = useState(records)
  const [selectedSlug, setSelectedSlug] = useState(
    initialSlug ?? records[0]?.batch.slug ?? '',
  )
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview')
  const [workingDrafts, setWorkingDrafts] = useState<Record<string, BatchConfigDraft>>({})
  const [message, setMessage] = useState('')
  const [saveBusy, setSaveBusy] = useState<'draft' | 'publish' | ''>('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [confirmMajorUpdate, setConfirmMajorUpdate] = useState(false)
  const [notificationBusy, setNotificationBusy] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')

  const selectedRecord = serverRecords.find(
    (record) => record.batch.slug === selectedSlug,
  )
  const selectedBatch = selectedRecord?.batch
  const sourceDraft = selectedBatch ? createBatchConfigDraft(selectedBatch) : undefined
  const draft = workingDrafts[selectedSlug] ?? sourceDraft
  const hasUnsavedChanges =
    draft !== undefined &&
    sourceDraft !== undefined &&
    JSON.stringify(draft) !== JSON.stringify(sourceDraft)
  const validationErrors = draft ? validateBatchConfigDraft(draft) : []

  function replaceDraft(nextDraft: BatchConfigDraft) {
    setWorkingDrafts((current) => ({ ...current, [selectedSlug]: nextDraft }))
    setMessage('')
  }

  function updateDraft(patch: Partial<BatchConfigDraft>) {
    if (!draft) return
    replaceDraft({ ...draft, ...patch })
  }

  function updatePrice(field: keyof BatchPrice, value: number | string) {
    if (!draft) return
    updateDraft({
      claimPrice: { ...(draft.claimPrice ?? EMPTY_PRICE), [field]: value },
    })
  }

  function updateInventory(field: keyof BatchInventory, value: number) {
    if (!draft) return
    updateDraft({
      inventory: { ...(draft.inventory ?? EMPTY_INVENTORY), [field]: value },
    })
  }

  function updateLatestUpdate(
    field: 'body' | 'date' | 'title',
    value: string,
  ) {
    if (!draft) return
    setConfirmMajorUpdate(false)
    setNotificationMessage('')
    updateDraft({
      latestUpdate: { ...draft.latestUpdate, [field]: value },
    })
  }

  function updateLatestUpdateMedia(value: string) {
    if (!draft) return
    setConfirmMajorUpdate(false)
    setNotificationMessage('')
    updateDraft({
      latestUpdate: {
        ...draft.latestUpdate,
        media: parseMediaLines(value),
      },
    })
  }

  function updateStageMedia(id: string, value: string) {
    if (!draft) return
    updateDraft({
      distributionStages: draft.distributionStages.map((stage) =>
        stage.id === id
          ? { ...stage, media: parseMediaLines(value) }
          : stage,
      ),
    })
  }

  async function notifyFollowers() {
    if (!draft || !confirmMajorUpdate) return
    setNotificationBusy('major-update')
    setNotificationMessage('')
    const result = await sendBatchMajorUpdate({
      batchSlug: selectedSlug,
      date: draft.latestUpdate.date,
      title: draft.latestUpdate.title,
      body: draft.latestUpdate.body,
    })
    setNotificationBusy('')
    setConfirmMajorUpdate(false)
    if (result.error) {
      setNotificationMessage(result.error)
      return
    }
    if ('sent' in result) {
      setNotificationMessage(
        `Follower update complete · ${result.sent} sent · ${result.skipped} already recorded.`,
      )
    }
  }

  async function notifyHolders(stage: DistributionStage) {
    if (stage.status === 'upcoming') return
    setNotificationBusy(stage.id)
    setNotificationMessage('')
    const result = await sendBatchDistributionUpdate({
      batchSlug: selectedSlug,
      stage,
    })
    setNotificationBusy('')
    if (result.error) {
      setNotificationMessage(result.error)
      return
    }
    if ('sent' in result) {
      setNotificationMessage(
        `${stage.label} update complete · ${result.sent} sent · ${result.skipped} already recorded.`,
      )
    }
  }

  function updateStage(
    id: string,
    field: 'contents' | 'label' | 'status' | 'summary' | 'window',
    value: string,
  ) {
    if (!draft) return
    updateDraft({
      distributionStages: draft.distributionStages.map((stage) =>
        stage.id === id
          ? {
              ...stage,
              [field]:
                field === 'contents'
                  ? value
                      .split('\n')
                      .map((item) => item.trim())
                      .filter(Boolean)
                  : value,
            }
          : stage,
      ),
    })
  }

  function addStage() {
    if (!draft) return
    updateDraft({
      distributionStages: [
        ...draft.distributionStages,
        {
          contents: [],
          id: createStageId(draft.distributionStages),
          label: 'New pack',
          status: 'upcoming',
          summary: '',
          window: 'Window pending',
        },
      ],
    })
  }

  function removeStage(id: string) {
    if (!draft) return
    updateDraft({
      distributionStages: draft.distributionStages.filter((stage) => stage.id !== id),
    })
  }

  function moveStage(index: number, direction: -1 | 1) {
    if (!draft) return
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= draft.distributionStages.length) return

    const stages = [...draft.distributionStages]
    const currentStage = stages[index]
    const targetStage = stages[targetIndex]
    if (!currentStage || !targetStage) return
    stages[index] = targetStage
    stages[targetIndex] = currentStage
    updateDraft({ distributionStages: stages })
  }

  async function persistBatch(publish: boolean) {
    if (!draft || !selectedBatch || !selectedRecord) return
    const [firstError] = validateBatchConfigDraft(draft)
    if (firstError) {
      setMessage(firstError)
      return
    }

    const normalizedDraft = normalizeBatchConfigDraft(draft)
    if (publish && !window.confirm(`Publish all current changes for “${draft.name}” to the live Device page? This also applies any stock, pricing, and Pack changes. Preview environments may share production data. Follower emails are sent separately.`)) return
    const batch = { ...selectedBatch, ...normalizedDraft }
    setSaveBusy(publish ? 'publish' : 'draft')
    setMessage('')
    const result = await saveDeviceBatchRecord({
      batch,
      expectedRevision: selectedRecord.revision,
      publish,
    })
    setSaveBusy('')
    if (result.error || !result.record) {
      setMessage(result.error ?? 'Batch could not be saved.')
      return
    }

    setServerRecords((current) =>
      current.map((record) =>
        record.batch.slug === selectedSlug ? result.record! : record,
      ),
    )
    setWorkingDrafts((current) => ({
      ...current,
      [selectedSlug]: createBatchConfigDraft(result.record!.batch),
    }))
    setMessage(
      publish
        ? `Revision ${result.record.revision} is live.`
        : `Revision ${result.record.revision} saved to the shared backend.`,
    )
  }

  function resetUnsavedChanges() {
    if (!sourceDraft) return
    setWorkingDrafts((current) => ({
      ...current,
      [selectedSlug]: sourceDraft,
    }))
    setMessage('Unsaved changes reverted.')
  }

  if (!selectedBatch || !draft) return null

  const price = draft.claimPrice ?? EMPTY_PRICE
  const inventory = draft.inventory ?? EMPTY_INVENTORY
  const remainingQuantity = getRemainingQuantity(draft.inventory)
  const tabs = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'claim', label: 'CLAIM & STOCK' },
    { count: draft.distributionStages.length, id: 'packs', label: 'PACKS' },
    { id: 'update', label: 'LATEST UPDATE' },
  ]
  const savedDraft = !hasUnsavedChanges && selectedRecord.hasUnpublishedChanges
  const saveSucceeded = message.startsWith('Revision ')
  const saveFeedback = message
    ? {
        label: saveSucceeded
          ? selectedRecord.hasUnpublishedChanges
            ? 'DRAFT SAVED'
            : 'PUBLISHED LIVE'
          : 'SAVE FAILED',
        state: saveSucceeded ? 'success' : 'error',
        text: message,
      }
    : validationErrors.length > 0
      ? {
          label: 'ACTION REQUIRED',
          state: 'error',
          text: validationErrors.join(' '),
        }
      : hasUnsavedChanges
        ? {
            label: 'UNSAVED CHANGES',
            state: 'pending',
            text: 'Save a private draft before leaving this page.',
          }
        : savedDraft
          ? {
              label: 'SAVED DRAFT',
              state: 'pending',
              text: 'This revision is stored in the shared backend but is not public until you choose PUBLISH LIVE.',
            }
          : null

  return (
    <div className={styles.editor}>
      <section className={styles.workspaceHeader}>
        <ArchiveField htmlFor="batch-config-selector" label="SELECT BATCH">
          <select
            id="batch-config-selector"
            onChange={(event) => {
              setSelectedSlug(event.target.value)
              setActiveTab('overview')
              setMessage('')
              setNotificationMessage('')
              setConfirmMajorUpdate(false)
              setPreviewOpen(false)
            }}
            value={selectedSlug}
          >
            {serverRecords.map((record) => (
              <option key={record.batch.slug} value={record.batch.slug}>
                {record.batch.code} · {record.batch.name}
                {record.publicationStatus === 'draft' ? ' · DRAFT' : ''}
                {record.hasUnpublishedChanges ? ' · CHANGES' : ''}
              </option>
            ))}
          </select>
        </ArchiveField>

        <div className={styles.workspaceActions}>
          <ArchiveButton
            onClick={() => setPreviewOpen((current) => !current)}
            variant="secondary"
          >
            <Eye aria-hidden size={15} /> {previewOpen ? 'CLOSE PREVIEW' : 'PREVIEW'}
          </ArchiveButton>
          <ArchiveButton
            disabled={
              !hasUnsavedChanges || validationErrors.length > 0 || Boolean(saveBusy)
            }
            onClick={() => void persistBatch(false)}
            variant="secondary"
          >
            <Save aria-hidden size={15} />
            {saveBusy === 'draft' ? 'SAVING…' : 'SAVE DRAFT'}
          </ArchiveButton>
        </div>

        {saveFeedback ? (
          <div
            aria-live="polite"
            className={styles.saveFeedback}
            data-state={saveFeedback.state}
            role="status"
          >
            <strong>{saveFeedback.label}</strong>
            <p>{saveFeedback.text}</p>
          </div>
        ) : null}

        <section className={styles.batchSummary} aria-label="Selected Batch summary">
          <div className={styles.batchIdentity}>
            <span>{selectedBatch.code}</span>
            <strong>{selectedBatch.name}</strong>
            <small>{selectedBatch.location} · {draft.timeZone}</small>
          </div>
          <div>
            <span>PUBLICATION</span>
            <strong>
              {selectedRecord.publicationStatus.toUpperCase()}
              {selectedRecord.hasUnpublishedChanges ? ' · CHANGES' : ''}
            </strong>
          </div>
          <div>
            <span>LISTED</span>
            <strong>{draft.inventory?.listingQuantity ?? '—'}</strong>
          </div>
          <div>
            <span>AVAILABLE</span>
            <strong>{draft.inventory ? remainingQuantity : '—'}</strong>
          </div>
          <div>
            <span>CHANGES</span>
            <strong
              className={hasUnsavedChanges || savedDraft ? styles.pending : styles.ready}
            >
              {hasUnsavedChanges
                ? 'UNSAVED'
                : savedDraft
                  ? 'SAVED DRAFT'
                  : `REV ${selectedRecord.revision || 'SOURCE'}`}
            </strong>
          </div>
        </section>
      </section>

      <div className={styles.workspaceShell}>
        <aside className={styles.sectionNavigation} aria-label="Edit Batch sections">
          <div className={styles.sectionNavigationHeading}>
            <span>EDIT BATCH</span>
            <strong>{selectedBatch.name}</strong>
          </div>
          <ArchiveTabs
            activeId={activeTab}
            ariaLabel="Batch configuration sections"
            items={tabs}
            onChange={(id) => {
              setActiveTab(id as WorkspaceTab)
              setMessage('')
            }}
          />
        </aside>

        <div className={styles.workspaceContent}>

      {previewOpen ? (
        <section className={styles.previewPanel} aria-label="Batch frontend preview">
          <div className={styles.previewHeader}>
            <div>
              <span>FRONTEND PREVIEW</span>
              <h2>{selectedBatch.name}</h2>
              <p>{draft.statusLine}</p>
            </div>
            <button
              aria-label="Close preview"
              onClick={() => setPreviewOpen(false)}
              type="button"
            >
              <X aria-hidden size={18} />
            </button>
          </div>
          <div className={styles.previewStats}>
            <div>
              <span>STATUS</span>
              <strong>{DEVICE_BATCH_STATUS[draft.status].label}</strong>
            </div>
            <div>
              <span>PRICE</span>
              <strong>
                {draft.claimPrice ? formatBatchPrice(draft.claimPrice) : 'PENDING'}
              </strong>
            </div>
            <div>
              <span>AVAILABLE</span>
              <strong>
                {draft.inventory
                  ? `${remainingQuantity} / ${draft.inventory.listingQuantity}`
                  : 'PENDING'}
              </strong>
            </div>
            <div>
              <span>PACKS</span>
              <strong>{draft.distributionStages.length}</strong>
            </div>
          </div>
          <div className={styles.previewMilestone}>
            <span>NEXT MILESTONE</span>
            <strong>{draft.nextMilestone || 'Pending'}</strong>
          </div>
        </section>
      ) : null}

      {activeTab === 'overview' ? (
        <section
          aria-label="Public overview"
          className={styles.workspaceSection}
          role="tabpanel"
        >
          <div className={styles.sectionHeading}>
            <div>
              <h2>Public overview</h2>
              <p>Update the Batch state and the short information visible across the archive.</p>
            </div>
          </div>
          <BatchCameraFields value={draft.liveCamera} onChange={(liveCamera) => updateDraft({ liveCamera })} />
          <div className={styles.formCard}>
            <div className={styles.threeColumnGrid}>
              <ArchiveField htmlFor="batch-name" label="BATCH NAME">
                <input
                  id="batch-name"
                  onChange={(event) => updateDraft({ name: event.target.value })}
                  value={draft.name}
                />
              </ArchiveField>
              <ArchiveField htmlFor="batch-code" label="BATCH CODE">
                <input
                  id="batch-code"
                  onChange={(event) =>
                    updateDraft({ code: event.target.value.toUpperCase() })
                  }
                  value={draft.code}
                />
              </ArchiveField>
              <ArchiveField htmlFor="batch-location" label="LOCATION">
                <input
                  id="batch-location"
                  onChange={(event) => updateDraft({ location: event.target.value })}
                  value={draft.location}
                />
              </ArchiveField>
            </div>
            <div className={styles.threeColumnGrid}>
              <ArchiveField htmlFor="batch-status" label="STATUS">
                <select
                  id="batch-status"
                  onChange={(event) =>
                    updateDraft({ status: event.target.value as BatchConfigDraft['status'] })
                  }
                  value={draft.status}
                >
                  {Object.entries(DEVICE_BATCH_STATUS).map(([status, labels]) => (
                    <option key={status} value={status}>
                      {labels.label}
                    </option>
                  ))}
                </select>
              </ArchiveField>
              <ArchiveField htmlFor="batch-time-zone" label="TIME ZONE">
                <input
                  id="batch-time-zone"
                  list="batch-time-zone-options"
                  onChange={(event) => updateDraft({ timeZone: event.target.value })}
                  value={draft.timeZone}
                />
                <datalist id="batch-time-zone-options">
                  {DEVICE_BATCH_TIME_ZONE_OPTIONS.map((timeZone) => (
                    <option key={timeZone} value={timeZone} />
                  ))}
                </datalist>
              </ArchiveField>
              <ArchiveField htmlFor="batch-updated-at" label="LAST UPDATED">
                <input
                  id="batch-updated-at"
                  onChange={(event) => updateDraft({ updatedAt: event.target.value })}
                  placeholder="Jul 30, 2026"
                  value={draft.updatedAt}
                />
              </ArchiveField>
            </div>
            <ArchiveField htmlFor="batch-completion" label="FINAL COMPLETION">
              <input
                id="batch-completion"
                onChange={(event) =>
                  updateDraft({ estimatedCompletion: event.target.value })
                }
                value={draft.estimatedCompletion}
              />
            </ArchiveField>
            <ArchiveField htmlFor="batch-status-line" label="CURRENT STATUS LINE">
              <input
                id="batch-status-line"
                onChange={(event) => updateDraft({ statusLine: event.target.value })}
                value={draft.statusLine}
              />
            </ArchiveField>
            <ArchiveField htmlFor="batch-milestone" label="NEXT MILESTONE">
              <input
                id="batch-milestone"
                onChange={(event) => updateDraft({ nextMilestone: event.target.value })}
                value={draft.nextMilestone}
              />
            </ArchiveField>
            <ArchiveField htmlFor="batch-summary" label="PUBLIC SUMMARY">
              <textarea
                id="batch-summary"
                onChange={(event) => updateDraft({ summary: event.target.value })}
                rows={5}
                value={draft.summary}
              />
            </ArchiveField>
            <div className={styles.twoColumnGrid}>
              <ArchiveField htmlFor="batch-primary-image" label="PRIMARY IMAGE URL">
                <input
                  id="batch-primary-image"
                  onChange={(event) => updateDraft({ image: event.target.value })}
                  value={draft.image}
                />
              </ArchiveField>
              <ArchiveField htmlFor="batch-image-fit" label="IMAGE FIT">
                <select
                  id="batch-image-fit"
                  onChange={(event) =>
                    updateDraft({
                      imageFit: event.target.value as 'contain' | 'cover',
                    })
                  }
                  value={draft.imageFit ?? 'cover'}
                >
                  <option value="cover">COVER</option>
                  <option value="contain">CONTAIN</option>
                </select>
              </ArchiveField>
            </div>
            <ArchiveField htmlFor="batch-image-alt" label="PRIMARY IMAGE ALT TEXT">
              <input
                id="batch-image-alt"
                onChange={(event) => updateDraft({ imageAlt: event.target.value })}
                value={draft.imageAlt}
              />
            </ArchiveField>
            <ArchiveField htmlFor="batch-hero-caption" label="HERO CAPTION">
              <input
                id="batch-hero-caption"
                onChange={(event) => updateDraft({ heroCaption: event.target.value })}
                value={draft.heroCaption}
              />
            </ArchiveField>
            <ArchiveField
              htmlFor="batch-hero-media"
              label="HERO MEDIA · KIND | URL | CAPTION | ALT | POSTER"
            >
              <textarea
                id="batch-hero-media"
                onChange={(event) =>
                  updateDraft({ heroMedia: parseMediaLines(event.target.value) })
                }
                rows={5}
                value={formatMediaLines(draft.heroMedia)}
              />
            </ArchiveField>
            <div className={styles.threeColumnGrid}>
              <ArchiveField htmlFor="batch-lead-name" label="FIELD LEAD">
                <input
                  id="batch-lead-name"
                  onChange={(event) =>
                    updateDraft({
                      lead: { ...draft.lead, name: event.target.value },
                    })
                  }
                  value={draft.lead.name}
                />
              </ArchiveField>
              <ArchiveField htmlFor="batch-lead-role" label="LEAD ROLE">
                <input
                  id="batch-lead-role"
                  onChange={(event) =>
                    updateDraft({
                      lead: { ...draft.lead, role: event.target.value },
                    })
                  }
                  value={draft.lead.role}
                />
              </ArchiveField>
              <ArchiveField htmlFor="batch-lead-initials" label="INITIALS">
                <input
                  id="batch-lead-initials"
                  onChange={(event) =>
                    updateDraft({
                      lead: {
                        ...draft.lead,
                        initials: event.target.value.toUpperCase(),
                      },
                    })
                  }
                  value={draft.lead.initials}
                />
              </ArchiveField>
            </div>
            <ArchiveField htmlFor="batch-lead-bio" label="FIELD LEAD BIO">
              <textarea
                id="batch-lead-bio"
                onChange={(event) =>
                  updateDraft({
                    lead: { ...draft.lead, bio: event.target.value },
                  })
                }
                rows={4}
                value={draft.lead.bio}
              />
            </ArchiveField>
            <ArchiveField htmlFor="batch-lead-note" label="FIELD LEAD LATEST NOTE">
              <textarea
                id="batch-lead-note"
                onChange={(event) =>
                  updateDraft({
                    lead: { ...draft.lead, latestNote: event.target.value },
                  })
                }
                rows={3}
                value={draft.lead.latestNote}
              />
            </ArchiveField>
          </div>
        </section>
      ) : null}

      {activeTab === 'claim' ? (
        <section
          aria-label="Claim and stock"
          className={styles.workspaceSection}
          role="tabpanel"
        >
          <div className={styles.sectionHeading}>
            <div>
              <h2>Claim &amp; stock</h2>
              <p>Set one Batch price and the number of Consoles available for claim.</p>
            </div>
          </div>

          <div className={styles.inventoryDashboard}>
            <div>
              <span>LISTING QUANTITY</span>
              <strong>{inventory.listingQuantity}</strong>
              <small>Total Consoles released for this Batch.</small>
            </div>
            <div>
              <span>CLAIMED</span>
              <strong>{inventory.claimedQuantity}</strong>
              <small>Completed claims recorded so far.</small>
            </div>
            <div>
              <span>AVAILABLE NOW</span>
              <strong>{remainingQuantity}</strong>
              <small>Calculated automatically from listing minus claimed.</small>
            </div>
          </div>

          <div className={styles.formCard}>
            <div className={styles.twoColumnGrid}>
              <ArchiveField htmlFor="batch-listing-quantity" label="LISTING QUANTITY">
                <input
                  id="batch-listing-quantity"
                  min="0"
                  onChange={(event) =>
                    updateInventory('listingQuantity', Number(event.target.value))
                  }
                  step="1"
                  type="number"
                  value={inventory.listingQuantity}
                />
              </ArchiveField>
              <ArchiveField htmlFor="batch-claimed-quantity" label="CLAIMED UNITS">
                <input
                  disabled={selectedRecord.persisted}
                  id="batch-claimed-quantity"
                  min="0"
                  onChange={(event) =>
                    updateInventory('claimedQuantity', Number(event.target.value))
                  }
                  step="1"
                  type="number"
                  value={inventory.claimedQuantity}
                />
              </ArchiveField>
            </div>

            <div className={styles.twoColumnGrid}>
              <ArchiveField htmlFor="batch-price-amount" label="BATCH PRICE">
                <input
                  id="batch-price-amount"
                  min="0"
                  onChange={(event) => updatePrice('amount', Number(event.target.value))}
                  step="0.01"
                  type="number"
                  value={price.amount}
                />
              </ArchiveField>
              <ArchiveField htmlFor="batch-price-currency" label="CURRENCY">
                <input
                  id="batch-price-currency"
                  maxLength={3}
                  onChange={(event) =>
                    updatePrice('currency', event.target.value.toUpperCase())
                  }
                  value={price.currency}
                />
              </ArchiveField>
            </div>
            <ArchiveField htmlFor="batch-price-description" label="WHAT THE CLAIM INCLUDES">
              <textarea
                id="batch-price-description"
                onChange={(event) => updatePrice('description', event.target.value)}
                rows={4}
                value={price.description}
              />
            </ArchiveField>
          </div>
        </section>
      ) : null}

      {activeTab === 'packs' ? (
        <section
          aria-label="Distribution packs"
          className={styles.workspaceSection}
          role="tabpanel"
        >
          <div className={styles.sectionHeading}>
            <div>
              <h2>Distribution packs</h2>
              <p>Add, reorder, and update each shipment in this Batch.</p>
            </div>
            <ArchiveButton onClick={addStage} variant="secondary">
              <Plus aria-hidden size={15} /> ADD PACK
            </ArchiveButton>
          </div>

          <div className={styles.stageList}>
            {draft.distributionStages.map((stage, index) => (
              <article className={styles.stageCard} key={stage.id}>
                <div className={styles.stageHeader}>
                  <div>
                    <span>PACK {String(index + 1).padStart(2, '0')}</span>
                    <strong>{stage.label || 'Untitled Pack'}</strong>
                  </div>
                  <div>
                    <button
                      aria-label={`Move ${stage.label} earlier`}
                      disabled={index === 0}
                      onClick={() => moveStage(index, -1)}
                      type="button"
                    >
                      <ArrowUp aria-hidden size={15} />
                    </button>
                    <button
                      aria-label={`Move ${stage.label} later`}
                      disabled={index === draft.distributionStages.length - 1}
                      onClick={() => moveStage(index, 1)}
                      type="button"
                    >
                      <ArrowDown aria-hidden size={15} />
                    </button>
                    <button
                      aria-label={`Remove ${stage.label}`}
                      onClick={() => removeStage(stage.id)}
                      type="button"
                    >
                      <Trash2 aria-hidden size={15} />
                    </button>
                  </div>
                </div>

                <div className={styles.stageFields}>
                  <ArchiveField htmlFor={`${stage.id}-label`} label="PACK NAME">
                    <input
                      id={`${stage.id}-label`}
                      onChange={(event) =>
                        updateStage(stage.id, 'label', event.target.value)
                      }
                      value={stage.label}
                    />
                  </ArchiveField>
                  <div className={styles.stageMetaFields}>
                    <ArchiveField htmlFor={`${stage.id}-window`} label="DELIVERY WINDOW">
                      <input
                        id={`${stage.id}-window`}
                        onChange={(event) =>
                          updateStage(stage.id, 'window', event.target.value)
                        }
                        value={stage.window}
                      />
                    </ArchiveField>
                    <ArchiveField htmlFor={`${stage.id}-status`} label="PACK STATUS">
                      <select
                        id={`${stage.id}-status`}
                        onChange={(event) =>
                          updateStage(stage.id, 'status', event.target.value)
                        }
                        value={stage.status}
                      >
                        <option value="upcoming">UPCOMING</option>
                        <option value="current">CURRENT</option>
                        <option value="completed">COMPLETED</option>
                      </select>
                    </ArchiveField>
                  </div>
                  <ArchiveField htmlFor={`${stage.id}-summary`} label="SUMMARY">
                    <textarea
                      id={`${stage.id}-summary`}
                      onChange={(event) =>
                        updateStage(stage.id, 'summary', event.target.value)
                      }
                      rows={3}
                      value={stage.summary}
                    />
                  </ArchiveField>
                  <ArchiveField
                    htmlFor={`${stage.id}-contents`}
                    label="CONTENTS · ONE ITEM PER LINE"
                  >
                    <textarea
                      id={`${stage.id}-contents`}
                      onChange={(event) =>
                        updateStage(stage.id, 'contents', event.target.value)
                      }
                      rows={4}
                      value={stage.contents.join('\n')}
                    />
                  </ArchiveField>
                  <ArchiveField
                    htmlFor={`${stage.id}-media`}
                    label="PACK MEDIA · KIND | URL | CAPTION | ALT | POSTER"
                  >
                    <textarea
                      id={`${stage.id}-media`}
                      onChange={(event) =>
                        updateStageMedia(stage.id, event.target.value)
                      }
                      rows={4}
                      value={formatMediaLines(stage.media)}
                    />
                  </ArchiveField>
                  <div className={styles.notificationPanel}>
                    <div>
                      <strong>HOLDER EMAIL</strong>
                      <p>
                        {stage.status === 'upcoming'
                          ? 'Set this Pack to Current or Completed before notifying holders.'
                          : `Send the ${stage.status} update to paid holders of this Batch.`}
                      </p>
                    </div>
                    <ArchiveButton
                      disabled={stage.status === 'upcoming' || notificationBusy === stage.id}
                      onClick={() => notifyHolders(stage)}
                      variant="secondary"
                    >
                      <Send aria-hidden size={15} />
                      {notificationBusy === stage.id ? 'SENDING…' : 'EMAIL HOLDERS'}
                    </ArchiveButton>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === 'update' ? (
        <section
          aria-label="Latest public update"
          className={styles.workspaceSection}
          role="tabpanel"
        >
          <div className={styles.sectionHeading}>
            <div>
              <h2>Latest public update</h2>
              <p>Edit this report, save a private draft, then choose PUBLISH LIVE below. Publishing applies all current Batch changes; the date is descriptive, not a schedule.</p>
            </div>
          </div>
          <div className={styles.updateLayout}>
            <div className={styles.formCard}>
              <ArchiveField htmlFor="batch-update-date" label="UPDATE DATE">
                <input
                  id="batch-update-date"
                  onChange={(event) => updateLatestUpdate('date', event.target.value)}
                  placeholder="Jul 30, 2026"
                  value={draft.latestUpdate.date}
                />
              </ArchiveField>
              <ArchiveField htmlFor="batch-update-title" label="UPDATE TITLE">
                <input
                  id="batch-update-title"
                  onChange={(event) => updateLatestUpdate('title', event.target.value)}
                  value={draft.latestUpdate.title}
                />
              </ArchiveField>
              <ArchiveField htmlFor="batch-update-body" label="UPDATE BODY">
                <textarea
                  id="batch-update-body"
                  onChange={(event) => updateLatestUpdate('body', event.target.value)}
                  rows={8}
                  value={draft.latestUpdate.body}
                />
              </ArchiveField>
              <ArchiveField
                htmlFor="batch-update-media"
                label="UPDATE MEDIA · KIND | URL | CAPTION | ALT | POSTER"
              >
                <textarea
                  id="batch-update-media"
                  onChange={(event) =>
                    updateLatestUpdateMedia(event.target.value)
                  }
                  rows={4}
                  value={formatMediaLines(draft.latestUpdate.media)}
                />
              </ArchiveField>
            </div>
            <article className={styles.updatePreview}>
              <span>LIVE PREVIEW</span>
              <small>{draft.latestUpdate.date || 'DATE PENDING'}</small>
              <h3>{draft.latestUpdate.title || 'Untitled update'}</h3>
              <p>{draft.latestUpdate.body || 'Add the newest Batch progress.'}</p>
            </article>
          </div>
          <div className={styles.notificationPanel}>
            <div>
              <strong>FOLLOWER EMAIL</strong>
              <p>
                Send this update to members who follow this Batch. Saving a draft alone
                never sends an email.
              </p>
              <label className={styles.notificationConfirmation}>
                <input
                  checked={confirmMajorUpdate}
                  onChange={(event) => setConfirmMajorUpdate(event.target.checked)}
                  type="checkbox"
                />
                I confirm this is a major update worth emailing.
              </label>
            </div>
            <ArchiveButton
              disabled={
                !confirmMajorUpdate
                || !draft.latestUpdate.title.trim()
                || !draft.latestUpdate.body.trim()
                || notificationBusy === 'major-update'
              }
              onClick={notifyFollowers}
            >
              <Send aria-hidden size={15} />
              {notificationBusy === 'major-update' ? 'SENDING…' : 'EMAIL FOLLOWERS'}
            </ArchiveButton>
          </div>
        </section>
      ) : null}
        </div>
      </div>

      <section className={styles.saveBar}>
        <div>
          <span>
            {selectedRecord.publicationStatus === 'published'
              ? 'SHARED BACKEND · LIVE RECORD'
              : 'SHARED BACKEND · DRAFT'}
          </span>
          <p>
            {validationErrors.length === 0
              ? savedDraft
                ? 'A saved revision is waiting to be published.'
                : hasUnsavedChanges
                  ? 'Unsaved changes are ready to store as a private draft.'
                  : 'Configuration is complete and ready to publish.'
              : validationErrors.join(' ')}
          </p>
          <div className={styles.secondaryActions}>
            <ArchiveButton
              disabled={!hasUnsavedChanges}
              onClick={resetUnsavedChanges}
              variant="ghost"
            >
              <RotateCcw aria-hidden size={15} /> REVERT CHANGES
            </ArchiveButton>
          </div>
        </div>
        <div className={styles.workspaceActions}>
          <ArchiveButton
            disabled={
              !hasUnsavedChanges || validationErrors.length > 0 || Boolean(saveBusy)
            }
            onClick={() => void persistBatch(false)}
            variant="secondary"
          >
            <Save aria-hidden size={15} />
            {saveBusy === 'draft' ? 'SAVING…' : 'SAVE DRAFT'}
          </ArchiveButton>
          <ArchiveButton
            disabled={validationErrors.length > 0 || Boolean(saveBusy)}
            onClick={() => void persistBatch(true)}
          >
            <UploadCloud aria-hidden size={15} />
            {saveBusy === 'publish' ? 'PUBLISHING…' : 'PUBLISH LIVE'}
          </ArchiveButton>
        </div>
      </section>

      {notificationMessage ? (
        <div className={styles.message} role="status">
          {notificationMessage}
        </div>
      ) : null}
    </div>
  )
}
