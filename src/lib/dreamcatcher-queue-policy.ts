/** Only device work belongs in the public queue; result polling does not. */
export function isDeviceQueueEntry(job: { status: string; roundStatus?: string }): boolean {
  if (job.roundStatus) return job.roundStatus === 'queued' || job.roundStatus === 'processing'
  return ['queued', 'processing', 'returning'].includes(job.status)
}
