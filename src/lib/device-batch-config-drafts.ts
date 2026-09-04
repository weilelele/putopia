import { isDeviceCameraBinding, type DeviceCameraBinding } from './device-camera'
import {
  getDeviceBatchTimeZone,
  isValidDeviceBatchTimeZone,
  type BatchInventory,
  type BatchPrice,
  type DeviceBatch,
  type DeviceBatchLead,
  type DeviceBatchMedia,
  type DeviceBatchStatus,
  type DistributionStage,
} from './device-batches'

export type BatchConfigDraft = {
  liveCamera?: DeviceCameraBinding
  code: string
  claimPrice?: BatchPrice
  distributionStages: DistributionStage[]
  estimatedCompletion: string
  heroCaption: string
  heroMedia?: DeviceBatchMedia[]
  image: string
  imageAlt: string
  imageFit?: 'cover' | 'contain'
  inventory?: BatchInventory
  latestUpdate: DeviceBatch['latestUpdate']
  lead: DeviceBatchLead
  location: string
  name: string
  nextMilestone: string
  status: DeviceBatchStatus
  statusLine: string
  summary: string
  timeZone: string
  updatedAt: string
}

export type BatchConfigDrafts = Record<string, BatchConfigDraft>

export const BATCH_CONFIG_DRAFTS_KEY = 'mc-device-batch-config-drafts:v2'
export const EMPTY_BATCH_CONFIG_DRAFTS_SNAPSHOT = '{}'

const draftListeners = new Set<() => void>()
let storageListenerAttached = false

const BATCH_STATUSES = new Set<DeviceBatchStatus>([
  'survey',
  'claim_open',
  'distribution',
  'active',
])
const STAGE_STATUSES = new Set<DistributionStage['status']>([
  'completed',
  'current',
  'upcoming',
])

function isBatchPrice(value: unknown): value is BatchPrice {
  if (!value || typeof value !== 'object') return false

  const price = value as Partial<BatchPrice>
  return (
    typeof price.amount === 'number' &&
    Number.isFinite(price.amount) &&
    typeof price.currency === 'string' &&
    typeof price.description === 'string'
  )
}

function isBatchInventory(value: unknown): value is BatchInventory {
  if (!value || typeof value !== 'object') return false

  const inventory = value as Partial<BatchInventory>
  return (
    typeof inventory.listingQuantity === 'number' &&
    Number.isInteger(inventory.listingQuantity) &&
    typeof inventory.claimedQuantity === 'number' &&
    Number.isInteger(inventory.claimedQuantity)
  )
}

function isLatestUpdate(value: unknown): value is DeviceBatch['latestUpdate'] {
  if (!value || typeof value !== 'object') return false

  const update = value as Partial<DeviceBatch['latestUpdate']>
  return (
    typeof update.date === 'string' &&
    typeof update.title === 'string' &&
    typeof update.body === 'string' &&
    (update.media === undefined || isMedia(update.media))
  )
}

function isDistributionStage(value: unknown): value is DistributionStage {
  if (!value || typeof value !== 'object') return false

  const stage = value as Partial<DistributionStage>
  return (
    typeof stage.id === 'string' &&
    typeof stage.label === 'string' &&
    typeof stage.window === 'string' &&
    typeof stage.summary === 'string' &&
    typeof stage.status === 'string' &&
    STAGE_STATUSES.has(stage.status as DistributionStage['status']) &&
    Array.isArray(stage.contents) &&
    stage.contents.every((item) => typeof item === 'string') &&
    (stage.archiveNote === undefined || typeof stage.archiveNote === 'string') &&
    (stage.media === undefined || isMedia(stage.media))
  )
}

function isMedia(value: unknown): value is DeviceBatchMedia[] {
  return (
    Array.isArray(value)
    && value.every((item) => {
      if (!item || typeof item !== 'object') return false
      const media = item as Partial<DeviceBatchMedia>
      return (
        (media.kind === 'image' || media.kind === 'video')
        && typeof media.src === 'string'
        && typeof media.alt === 'string'
        && typeof media.caption === 'string'
        && (media.poster === undefined || typeof media.poster === 'string')
      )
    })
  )
}

function isLead(value: unknown): value is DeviceBatchLead {
  if (!value || typeof value !== 'object') return false
  const lead = value as Partial<DeviceBatchLead>
  return (
    typeof lead.name === 'string'
    && typeof lead.role === 'string'
    && typeof lead.initials === 'string'
    && typeof lead.location === 'string'
    && typeof lead.bio === 'string'
    && typeof lead.latestNote === 'string'
  )
}

function isBatchConfigDraft(value: unknown): value is BatchConfigDraft {
  if (!value || typeof value !== 'object') return false

  const draft = value as Partial<BatchConfigDraft>
  return (
    typeof draft.status === 'string' &&
    BATCH_STATUSES.has(draft.status as DeviceBatchStatus) &&
    typeof draft.nextMilestone === 'string' &&
    typeof draft.estimatedCompletion === 'string' &&
    typeof draft.statusLine === 'string' &&
    typeof draft.summary === 'string' &&
    typeof draft.updatedAt === 'string' &&
    typeof draft.code === 'string' &&
    typeof draft.name === 'string' &&
    typeof draft.location === 'string' &&
    (draft.timeZone === undefined || typeof draft.timeZone === 'string') &&
    typeof draft.image === 'string' &&
    typeof draft.imageAlt === 'string' &&
    typeof draft.heroCaption === 'string' &&
    (draft.liveCamera === undefined || isDeviceCameraBinding(draft.liveCamera)) &&
    (draft.heroMedia === undefined || isMedia(draft.heroMedia)) &&
    isLead(draft.lead) &&
    isLatestUpdate(draft.latestUpdate) &&
    Array.isArray(draft.distributionStages) &&
    draft.distributionStages.every(isDistributionStage) &&
    (draft.inventory === undefined || isBatchInventory(draft.inventory)) &&
    (draft.claimPrice === undefined || isBatchPrice(draft.claimPrice))
  )
}

export function createBatchConfigDraft(batch: DeviceBatch): BatchConfigDraft {
  return {
    liveCamera: batch.liveCamera ? { ...batch.liveCamera } : undefined,
    code: batch.code,
    claimPrice: batch.claimPrice ? { ...batch.claimPrice } : undefined,
    distributionStages: batch.distributionStages.map((stage) => ({
      ...stage,
      contents: [...stage.contents],
      media: stage.media?.map((item) => ({ ...item })),
    })),
    estimatedCompletion: batch.estimatedCompletion,
    heroCaption: batch.heroCaption,
    heroMedia: batch.heroMedia?.map((item) => ({ ...item })),
    image: batch.image,
    imageAlt: batch.imageAlt,
    imageFit: batch.imageFit,
    inventory: batch.inventory ? { ...batch.inventory } : undefined,
    latestUpdate: {
      ...batch.latestUpdate,
      media: batch.latestUpdate.media?.map((item) => ({ ...item })),
    },
    lead: { ...batch.lead },
    location: batch.location,
    name: batch.name,
    nextMilestone: batch.nextMilestone,
    status: batch.status,
    statusLine: batch.statusLine,
    summary: batch.summary,
    timeZone: getDeviceBatchTimeZone(batch),
    updatedAt: batch.updatedAt,
  }
}

export function validateBatchConfigDraft(draft: BatchConfigDraft) {
  const errors: string[] = []
  if (draft.liveCamera !== undefined && !isDeviceCameraBinding(draft.liveCamera)) {
    errors.push('Camera requires a title, valid Cosmo channel and Band IDs, and a valid frame fit.')
  }
  const price = draft.claimPrice
  const currentStageCount = draft.distributionStages.filter(
    (stage) => stage.status === 'current',
  ).length

  if (
    draft.code.trim().length === 0 ||
    draft.name.trim().length === 0 ||
    draft.location.trim().length === 0 ||
    draft.timeZone.trim().length === 0 ||
    draft.image.trim().length === 0 ||
    draft.imageAlt.trim().length === 0 ||
    draft.heroCaption.trim().length === 0 ||
    draft.nextMilestone.trim().length === 0 ||
    draft.estimatedCompletion.trim().length === 0 ||
    draft.statusLine.trim().length === 0 ||
    draft.summary.trim().length === 0 ||
    draft.updatedAt.trim().length === 0
  ) {
    errors.push('Overview fields are required.')
  }
  if (!isValidDeviceBatchTimeZone(draft.timeZone)) {
    errors.push('Use a valid time zone such as Asia/Tokyo or Europe/London.')
  }
  if (draft.status === 'claim_open' && !price) {
    errors.push('A claim-open Batch requires a price.')
  }
  if (draft.status === 'claim_open' && !draft.inventory) {
    errors.push('A claim-open Batch requires listing inventory.')
  }
  if (
    draft.inventory !== undefined &&
    (draft.inventory.listingQuantity <= 0 ||
      draft.inventory.claimedQuantity < 0 ||
      draft.inventory.claimedQuantity > draft.inventory.listingQuantity)
  ) {
    errors.push('Claimed units must stay between zero and the listing quantity.')
  }
  if (
    price !== undefined &&
    (price.amount <= 0 || price.currency.trim().length !== 3)
  ) {
    errors.push('Price requires a positive amount and a three-letter currency code.')
  }
  if (
    draft.distributionStages.length === 0 ||
    draft.distributionStages.some(
      (stage) =>
        stage.label.trim().length === 0 ||
        stage.window.trim().length === 0 ||
        stage.summary.trim().length === 0 ||
        stage.contents.length === 0,
    )
  ) {
    errors.push('Every Batch needs at least one complete Pack with contents.')
  }
  if (currentStageCount > 1) {
    errors.push('Only one Pack can be marked current.')
  }
  if (
    draft.latestUpdate.date.trim().length === 0 ||
    draft.latestUpdate.title.trim().length === 0 ||
    draft.latestUpdate.body.trim().length === 0
  ) {
    errors.push('The latest update requires a date, title, and body.')
  }

  return errors
}

export function normalizeBatchConfigDraft(draft: BatchConfigDraft): BatchConfigDraft {
  return {
    ...draft,
    code: draft.code.trim().toUpperCase(),
    claimPrice: draft.claimPrice
      ? {
          ...draft.claimPrice,
          currency: draft.claimPrice.currency.trim().toUpperCase(),
          description: draft.claimPrice.description.trim(),
        }
      : undefined,
    distributionStages: draft.distributionStages.map((stage) => ({
      ...stage,
      contents: stage.contents.map((item) => item.trim()).filter(Boolean),
      label: stage.label.trim(),
      media: stage.media?.map((item) => ({
        ...item,
        alt: item.alt.trim(),
        caption: item.caption.trim(),
        poster: item.poster?.trim() || undefined,
        src: item.src.trim(),
      })),
      summary: stage.summary.trim(),
      window: stage.window.trim(),
    })),
    estimatedCompletion: draft.estimatedCompletion.trim(),
    liveCamera: draft.liveCamera ? { ...draft.liveCamera, title: draft.liveCamera.title.trim() } : undefined,
    heroCaption: draft.heroCaption.trim(),
    heroMedia: draft.heroMedia?.map((item) => ({
      ...item,
      alt: item.alt.trim(),
      caption: item.caption.trim(),
      poster: item.poster?.trim() || undefined,
      src: item.src.trim(),
    })),
    image: draft.image.trim(),
    imageAlt: draft.imageAlt.trim(),
    latestUpdate: {
      body: draft.latestUpdate.body.trim(),
      date: draft.latestUpdate.date.trim(),
      media: draft.latestUpdate.media?.map((item) => ({
        ...item,
        alt: item.alt.trim(),
        caption: item.caption.trim(),
        poster: item.poster?.trim() || undefined,
        src: item.src.trim(),
      })),
      title: draft.latestUpdate.title.trim(),
    },
    nextMilestone: draft.nextMilestone.trim(),
    lead: {
      ...draft.lead,
      bio: draft.lead.bio.trim(),
      initials: draft.lead.initials.trim().toUpperCase(),
      latestNote: draft.lead.latestNote.trim(),
      location: draft.lead.location.trim(),
      name: draft.lead.name.trim(),
      role: draft.lead.role.trim(),
    },
    location: draft.location.trim(),
    name: draft.name.trim(),
    statusLine: draft.statusLine.trim(),
    summary: draft.summary.trim(),
    timeZone: draft.timeZone.trim(),
    updatedAt: draft.updatedAt.trim(),
  }
}

export function parseBatchConfigDrafts(snapshot: string | null): BatchConfigDrafts {
  try {
    const parsed: unknown = JSON.parse(snapshot ?? EMPTY_BATCH_CONFIG_DRAFTS_SNAPSHOT)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, draft]) => isBatchConfigDraft(draft))
        .map(([slug, draft]) => [
          slug,
          {
            ...(draft as BatchConfigDraft),
            timeZone: getDeviceBatchTimeZone({
              slug,
              timeZone: (draft as Partial<BatchConfigDraft>).timeZone,
            }),
          },
        ]),
    )
  } catch {
    return {}
  }
}

export function getBatchConfigDraftsSnapshot() {
  if (typeof window === 'undefined') return EMPTY_BATCH_CONFIG_DRAFTS_SNAPSHOT

  try {
    return (
      window.localStorage.getItem(BATCH_CONFIG_DRAFTS_KEY) ??
      EMPTY_BATCH_CONFIG_DRAFTS_SNAPSHOT
    )
  } catch {
    return EMPTY_BATCH_CONFIG_DRAFTS_SNAPSHOT
  }
}

function emitDraftChange() {
  draftListeners.forEach((listener) => listener())
}

function handleStorageChange(event: StorageEvent) {
  if (event.key === BATCH_CONFIG_DRAFTS_KEY) emitDraftChange()
}

export function subscribeToBatchConfigDrafts(callback: () => void) {
  draftListeners.add(callback)
  if (!storageListenerAttached) {
    window.addEventListener('storage', handleStorageChange)
    storageListenerAttached = true
  }

  return () => {
    draftListeners.delete(callback)
    if (draftListeners.size === 0) {
      window.removeEventListener('storage', handleStorageChange)
      storageListenerAttached = false
    }
  }
}

export function saveBatchConfigDraft(slug: string, draft: BatchConfigDraft) {
  const drafts = parseBatchConfigDrafts(getBatchConfigDraftsSnapshot())
  const nextDrafts = { ...drafts, [slug]: draft }

  try {
    window.localStorage.setItem(BATCH_CONFIG_DRAFTS_KEY, JSON.stringify(nextDrafts))
  } catch {
    return false
  }

  emitDraftChange()
  return true
}

export function removeBatchConfigDraft(slug: string) {
  const drafts = parseBatchConfigDrafts(getBatchConfigDraftsSnapshot())
  if (!(slug in drafts)) return true

  const nextDrafts = { ...drafts }
  delete nextDrafts[slug]

  try {
    window.localStorage.setItem(BATCH_CONFIG_DRAFTS_KEY, JSON.stringify(nextDrafts))
  } catch {
    return false
  }

  emitDraftChange()
  return true
}
