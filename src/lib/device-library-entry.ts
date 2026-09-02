import { DEVICE_BATCH_STATUS, type DeviceBatch } from '@/lib/device-batches'

// A published Batch, not an individual device or an ownership record.
export function toDeviceLibraryEntry(batch: DeviceBatch) {
  return {
    id: batch.slug,
    batch_id: batch.code,
    href: `/devices/batches/${encodeURIComponent(batch.slug)}`,
    name: batch.name,
    description: batch.summary,
    location: batch.location,
    image_path: batch.image || null,
    status: batch.status,
    status_label: DEVICE_BATCH_STATUS[batch.status].label,
    updated_at: batch.updatedAt,
    // Compatibility fields for existing Studio and offline consumers.
    knowledge: 'known' as const,
    current_user_name: null,
    current_user_id: null,
    exploration_progress: batch.explorationProgress ?? 0,
  }
}
