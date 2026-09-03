import 'server-only'
import type { DeviceBatch } from './device-batches'
import { isDeviceCameraBinding, parseCameraOrigin, type DeviceCameraSource } from './device-camera'

/** Reads config only. Never persists the temporary demo binding into a Batch. */
export function getDeviceCameraSource(batch: DeviceBatch): DeviceCameraSource | null {
  const local = process.env.NODE_ENV !== 'production'
  const embedOrigin = parseCameraOrigin(process.env.COSMO_EMBED_ORIGIN, local)
  if (!embedOrigin) return null
  if (isDeviceCameraBinding(batch.liveCamera)) return { binding: batch.liveCamera, embedOrigin, demo: false }
  if (local && process.env.DEVICE_CAMERA_DEMO === '1') {
    return {
      embedOrigin, demo: true,
      binding: { provider: 'cosmo', channelId: '6a0419e515e35a5f46396a85', bandId: '6a0419f615e35a5f46396a8f', title: '宇宙飞船舱 · Cosmo test camera', fit: 'contain' },
    }
  }
  return null
}
