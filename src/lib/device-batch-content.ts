import type { DeviceBatch, DeviceBatchMedia, DeviceBatchUpdate, DistributionStageStatus } from './device-batches'

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
  const early = batch.status === 'survey'
  const searching = early && batch.preparationPhase === 'searching'
  const phase = (active: boolean): DistributionStageStatus => active ? 'current' : 'completed'
  const pack = (id: string, index: number) => batch.distributionStages.find((stage) => stage.id === id)
    ?? batch.distributionStages.filter((stage) => stage.id !== 'console')[index]
  const consoleStage = batch.distributionStages.find((stage) => stage.id === 'console')
    ?? batch.distributionStages.find((stage) => /console/i.test(stage.label))
  return [
    { label: 'SEARCH', fullLabel: 'Searching', status: phase(searching) },
    { label: 'PREP', fullLabel: 'Preparing', status: searching ? 'upcoming' as const : phase(early) },
    { label: 'PACK 1', fullLabel: 'Pack One', status: early ? 'upcoming' as const : pack('pack-one', 0)?.status ?? 'upcoming' },
    { label: 'PACK 2', fullLabel: 'Pack Two', status: early ? 'upcoming' as const : pack('pack-two', 1)?.status ?? 'upcoming' },
    { label: 'CONSOLE', fullLabel: 'Console', status: early ? 'upcoming' as const : consoleStage?.status ?? 'upcoming' },
  ]
}

export function isDeviceMediaUrl(value: string) {
  return /^\/(?!\/)/.test(value) || /^https:\/\//i.test(value)
}
