import type { DeviceCameraBinding } from './device-camera'

export type DeviceBatchStatus = 'survey' | 'claim_open' | 'distribution' | 'active'
export type DistributionStageStatus = 'completed' | 'current' | 'upcoming'

export type DeviceBatchLead = {
  name: string
  role: string
  initials: string
  location: string
  bio: string
  latestNote: string
}

export type DeviceBatchHolder = {
  name: string
  unit: string
  location: string
}

export type DeviceBatchMedia = {
  alt: string
  caption: string
  kind: 'image' | 'video'
  poster?: string
  src: string
}

export type DistributionStage = {
  id: string
  label: string
  window: string
  status: DistributionStageStatus
  summary: string
  contents: string[]
  archiveNote?: string
  media?: DeviceBatchMedia[]
}

export type BatchArchiveStage = {
  id: string
  label: string
  period: string
  summary: string
  evidence: string[]
}

export type BatchPrice = {
  amount: number
  currency: string
  description: string
}

export type BatchInventory = {
  claimedQuantity: number
  listingQuantity: number
}

export type DeviceBatch = {
  liveCamera?: DeviceCameraBinding
  slug: string
  code: string
  name: string
  location: string
  timeZone: string
  status: DeviceBatchStatus
  statusLine: string
  updatedAt: string
  nextMilestone: string
  image: string
  imageAlt: string
  imageFit?: 'cover' | 'contain'
  heroCaption: string
  heroMedia?: DeviceBatchMedia[]
  summary: string
  claimPrice?: BatchPrice
  inventory?: BatchInventory
  availability?: string
  estimatedCompletion: string
  explorationProgress?: number
  claimHref?: string
  facts: { label: string; value: string }[]
  lead: DeviceBatchLead
  holders: DeviceBatchHolder[]
  distributionStages: DistributionStage[]
  archiveStages: BatchArchiveStage[]
  latestUpdate: {
    date: string
    title: string
    body: string
    media?: DeviceBatchMedia[]
  }
}

export const DEVICE_BATCH_STATUS: Record<
  DeviceBatchStatus,
  { label: string; shortLabel: string }
> = {
  survey: { label: 'UNDER SURVEY', shortLabel: 'SURVEY' },
  claim_open: { label: 'CLAIM OPEN', shortLabel: 'CLAIM' },
  distribution: { label: 'DISTRIBUTION IN PROGRESS', shortLabel: 'DISTRIBUTING' },
  active: { label: 'ACTIVE IN FIELD', shortLabel: 'ACTIVE' },
}

export const DEVICE_BATCH_TIME_ZONE_OPTIONS = [
  'UTC',
  'Africa/Cairo',
  'America/Los_Angeles',
  'America/New_York',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Ulaanbaatar',
  'Europe/Berlin',
  'Europe/Lisbon',
  'Europe/London',
] as const

const LEGACY_BATCH_TIME_ZONES: Record<string, string> = {
  'berlin-origin-01': 'Europe/Berlin',
  'cairo-batch-01': 'Africa/Cairo',
  'gobi-array-07': 'Asia/Ulaanbaatar',
  'kyoto-relay-02': 'Asia/Tokyo',
}

export function isValidDeviceBatchTimeZone(value: string) {
  const timeZone = value.trim()
  if (timeZone !== 'UTC' && !timeZone.includes('/')) return false

  try {
    new Intl.DateTimeFormat('en-GB', { timeZone }).format(0)
    return true
  } catch {
    return false
  }
}

export function getDeviceBatchTimeZone(
  batch: Pick<DeviceBatch, 'slug'> & { timeZone?: unknown },
) {
  if (
    typeof batch.timeZone === 'string'
    && isValidDeviceBatchTimeZone(batch.timeZone)
  ) {
    return batch.timeZone.trim()
  }

  return LEGACY_BATCH_TIME_ZONES[batch.slug] ?? 'UTC'
}

export function formatDeviceBatchLocalTime(timeZone: string, now: number) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    second: '2-digit',
    timeZone,
  }).format(now)
}

export function formatBatchPrice(price: BatchPrice) {
  const currency = price.currency.toUpperCase()
  const numberOptions = {
    maximumFractionDigits: Number.isInteger(price.amount) ? 0 : 2,
    minimumFractionDigits: Number.isInteger(price.amount) ? 0 : 2,
  } as const

  if (!/^[A-Z]{3}$/.test(currency)) {
    return `${new Intl.NumberFormat('en-US', numberOptions).format(price.amount)} ${
      currency || '---'
    }`
  }

  let amount: string
  try {
    amount = new Intl.NumberFormat('en-US', {
      ...numberOptions,
      currency,
      currencyDisplay: 'narrowSymbol',
      style: 'currency',
    }).format(price.amount)
  } catch {
    amount = new Intl.NumberFormat('en-US', numberOptions).format(price.amount)
  }

  return `${amount} ${currency}`
}

export function getBatchClaimHref(batch: DeviceBatch) {
  if (!batch.claimHref) return undefined

  const params = new URLSearchParams({ batch: batch.slug })
  return `${batch.claimHref}?${params.toString()}`
}

export function getBatchAvailability(batch: DeviceBatch) {
  if (batch.inventory) {
    return `${batch.inventory.claimedQuantity} of ${batch.inventory.listingQuantity} units secured`
  }

  return batch.availability
}

export function getBatchRemainingQuantity(batch: DeviceBatch) {
  if (!batch.inventory) return undefined
  return Math.max(batch.inventory.listingQuantity - batch.inventory.claimedQuantity, 0)
}
