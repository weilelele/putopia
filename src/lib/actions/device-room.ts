'use server'
import { getPublicDeviceBatch } from '@/lib/device-batch-repository'
import { getRequestUser } from '@/lib/request-auth'
import { getDeviceClaimSupply } from './device-supply'
import { readInitiationSnapshot } from '@/lib/initiation-server'
import { readMyDeviceConsoles } from '@/lib/device-consoles-server'
import { getDeviceCameraSource } from '@/lib/device-camera-source'

/** Validate the public batch and resolve private state only for the selected room. */
export async function getDeviceRoom(slug: string) {
  const batch = await getPublicDeviceBatch(slug)
  if (!batch) throw new Error('Device batch unavailable.')
  const session = getRequestUser()
  const { data: { user }, error } = await session
  if (error && error.name !== 'AuthSessionMissingError') throw new Error('Your session could not be verified.')
  const [consoles, initiation, supplyStatus] = await Promise.all([
    readMyDeviceConsoles(user?.id ?? null), readInitiationSnapshot(session), getDeviceClaimSupply(slug),
  ])
  return {
    viewerId: user?.id ?? null, viewerRole: initiation.role, fetchedAt: Date.now(),
    room: {
      batch,
      claimAccess: { status: initiation.status, consoleClaim: initiation.consoleClaim, legacyPackPurchased: initiation.legacyPackPurchased, supplyStatus },
      camera: getDeviceCameraSource(batch),
      ownedConsole: consoles.find(console => console.order.device_batch_slug === slug) ?? null,
    },
  }
}
