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
      binding: { provider: 'cosmo', channelId: '6a8ecbc041b16262cb634785', bandId: '6a8ecbcf41b16262cb634790', title: '白天 · 海浪蜡烛', fit: 'contain' },
    }
  }
  return null
}
