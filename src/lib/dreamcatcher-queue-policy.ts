/** Only device work belongs in the public queue; result polling does not. */
export function isDeviceQueueEntry(job: { status: string; roundStatus?: string }): boolean {
  if (job.roundStatus) return job.roundStatus === 'queued' || job.roundStatus === 'processing'
  return ['queued', 'processing', 'returning'].includes(job.status)
}

/** Match the device scheduler: active work first, then oldest queued round/id. */
export function deviceQueueOrder<T extends { id: string; status: string; roundStatus?: string; queuedAt?: string; queueOrderId?: string }>(jobs: readonly T[]): T[] {
  const processing = (job: T) => job.roundStatus === 'processing' || (!job.roundStatus && job.status === 'processing')
  return jobs.filter(isDeviceQueueEntry).toSorted((a, b) => {
    const activeOrder = Number(processing(b)) - Number(processing(a))
    if (activeOrder) return activeOrder
    // Legacy callers without timestamps already supply oldest-first order.
    if (!a.queuedAt || !b.queuedAt) return 0
    // Supabase timestamps use UTC; preserve sub-millisecond FIFO before the id tie-break.
    return Date.parse(a.queuedAt) - Date.parse(b.queuedAt) || a.queuedAt.localeCompare(b.queuedAt) || (a.queueOrderId ?? a.id).localeCompare(b.queueOrderId ?? b.id)
  })
}
