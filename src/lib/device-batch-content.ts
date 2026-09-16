import { DEVICE_BATCH_PHASES, DEVICE_BATCH_STATUS, type DeviceBatch, type DeviceBatchMedia, type DeviceBatchUpdate, type DistributionStageStatus } from './device-batches'

/** Updates are explicit content; legacy reports and media are never imported. */
export function getDeviceBatchUpdates(batch: Pick<DeviceBatch, 'updates'>): DeviceBatchUpdate[] {
  return batch.updates ?? []
}

export const EMPTY_DEVICE_UPDATE = { date: '', title: '', body: '', media: [] } satisfies DeviceBatch['latestUpdate']

export function getUpdatePublicationState(update: DeviceBatchUpdate, published: DeviceBatchUpdate[]) {
  const live = published.find((item) => item.id === update.id)
  if (!live) return 'DRAFT'
  const content = (item: DeviceBatchUpdate) => JSON.stringify({
    date: item.date, title: item.title, body: item.body, media: item.media ?? [],
  })
  return content(live) === content(update) ? 'PUBLISHED' : 'UNPUBLISHED CHANGES'
}

export function getDeviceBatchMedia(batch: DeviceBatch): DeviceBatchMedia[] {
  const seen = new Set<string>()
  return getDeviceBatchUpdates(batch).flatMap((update) => update.media ?? []).filter((item) => {
    const key = `${item.kind}:${item.src}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function getDeviceBatchProgress(batch: DeviceBatch) {
  const current = DEVICE_BATCH_PHASES.indexOf(batch.status)
  return DEVICE_BATCH_PHASES.map((phase, index) => ({
    label: DEVICE_BATCH_STATUS[phase].shortLabel,
    fullLabel: DEVICE_BATCH_STATUS[phase].label,
    status: (index < current ? 'completed' : index === current ? 'current' : 'upcoming') as DistributionStageStatus,
  }))
}

export function isDeviceMediaUrl(value: string) {
  return /^\/(?!\/)/.test(value) || /^https:\/\//i.test(value)
}
