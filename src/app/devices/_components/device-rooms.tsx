import { getDeviceClaimSupply } from '@/lib/actions/device-supply'
import { getInitiationSnapshot } from '@/lib/actions/initiation'
import { getMcFunctions } from '@/lib/actions/mc-functions'
import { McConsolePanel } from '@/components/mc-console-panel'
import { getMyDeviceConsoles } from '@/lib/actions/orders'
import { getDeviceCameraSource } from '@/lib/device-camera-source'
import type { DeviceBatch } from '@/lib/device-batches'
import { DeviceRoomSwitcher } from './device-room-switcher'

export async function DeviceRooms({ batches, initialSlug }: {
  batches: DeviceBatch[]
  initialSlug: string
}) {
  const [consoles, mcFunctions, initiation] = await Promise.all([
    getMyDeviceConsoles(),
    getMcFunctions(),
    getInitiationSnapshot(),
  ])
  const rooms = await Promise.all(batches.map(async (batch) => ({
    batch,
    claimAccess: { status: initiation.status, consoleClaim: initiation.consoleClaim, legacyPackPurchased: initiation.legacyPackPurchased, supplyStatus: await getDeviceClaimSupply(batch.slug) },
    camera: getDeviceCameraSource(batch),
    ownedConsole: consoles.find((console) => console.order.device_batch_slug === batch.slug) ?? null,
  })))

  return <DeviceRoomSwitcher rooms={rooms} initialSlug={initialSlug} introduction={<McConsolePanel key="console-introduction" mcFunctions={mcFunctions} heroVideo={{ src: '/assets/device-reel.mp4', poster: '/assets/device-reel-poster.jpg' }} />} />
}
