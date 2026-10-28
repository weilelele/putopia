import { Suspense } from 'react'
import { getMcFunctions } from '@/lib/actions/mc-functions'
import { getDeviceRoom } from '@/lib/actions/device-room'
import { McConsolePanel } from '@/components/mc-console-panel'
import { DEVICE_REEL } from '@/lib/device-reel'
import type { DeviceBatch } from '@/lib/device-batches'
import { DeviceRoomSwitcher } from './device-room-switcher'

async function Introduction() {
  return <McConsolePanel mcFunctions={await getMcFunctions()} heroVideo={DEVICE_REEL} />
}

export async function DeviceRooms({ batches, initialSlug }: { batches: DeviceBatch[]; initialSlug: string }) {
  // Other batches load on selection. The introduction streams independently.
  const initial = await getDeviceRoom(initialSlug)
  return <DeviceRoomSwitcher batches={batches} initial={initial} introduction={<Suspense fallback={<p role="status">RETRIEVING ARCHIVE</p>}><Introduction /></Suspense>} />
}
