import { getDeviceRoom } from '@/lib/actions/device-room'
import { McConsolePanel } from '@/components/mc-console-panel'
import { DEVICE_REEL } from '@/lib/device-reel'
import type { DeviceBatch } from '@/lib/device-batches'
import { DeviceRoomSwitcher } from './device-room-switcher'

export async function DeviceRooms({ batches, initialSlug }: { batches: DeviceBatch[]; initialSlug: string }) {
  // Other batches load on selection; the introduction needs no function lookup.
  const initial = await getDeviceRoom(initialSlug)
  return <DeviceRoomSwitcher batches={batches} initial={initial} introduction={<McConsolePanel heroVideo={DEVICE_REEL} />} />
}
