import { getDeviceBatchDiscussion } from '@/lib/actions/device-batch-community'
import { getMyDeviceConsoles } from '@/lib/actions/orders'
import { getDeviceCameraSource } from '@/lib/device-camera-source'
import type { DeviceBatch } from '@/lib/device-batches'
import { DeviceRoomSwitcher } from './device-room-switcher'

export async function DeviceRooms({ batches, initialSlug }: {
  batches: DeviceBatch[]
  initialSlug: string
}) {
  const [discussions, consoles] = await Promise.all([
    Promise.all(batches.map((batch) => getDeviceBatchDiscussion(batch.slug))),
    getMyDeviceConsoles(),
  ])
  const rooms = batches.map((batch, index) => ({
    batch,
    camera: getDeviceCameraSource(batch),
    canPost: discussions[index].canPost,
    discussionPosts: discussions[index].posts,
    ownedConsole: consoles.find((console) => console.order.device_batch_slug === batch.slug) ?? null,
  }))

  return <DeviceRoomSwitcher rooms={rooms} initialSlug={initialSlug} />
}
