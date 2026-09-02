import 'server-only'

import { listPublicDeviceBatches } from '@/lib/device-batch-repository'
import { toDeviceLibraryEntry } from '@/lib/device-library-entry'

export async function listDeviceLibraryEntries(limit?: number) {
  const batches = await listPublicDeviceBatches()
  return batches.slice(0, limit ?? batches.length).map(toDeviceLibraryEntry)
}
