export type DeviceCameraBinding = {
  provider: 'cosmo'
  channelId: string
  bandId: string
  title: string
  fit: 'contain' | 'cover'
}

export type DeviceCameraSource = { binding: DeviceCameraBinding; embedOrigin: string; demo: boolean }
export type CameraPlaybackState = 'ready' | 'playing' | 'buffering' | 'autoplay-blocked' | 'unavailable' | 'error' | 'paused'
export type CameraStatusMessage = {
  type: 'cosmo.embed.status'
  version: 1
  channelId: string
  bandId: string
  state: CameraPlaybackState
  muted: boolean
}

const idPattern = /^[a-f0-9]{24}$/
const states = new Set<CameraPlaybackState>(['ready', 'playing', 'buffering', 'autoplay-blocked', 'unavailable', 'error', 'paused'])

export function isDeviceCameraBinding(value: unknown): value is DeviceCameraBinding {
  if (!value || typeof value !== 'object') return false
  const camera = value as Partial<DeviceCameraBinding>
  return camera.provider === 'cosmo' && typeof camera.channelId === 'string' && idPattern.test(camera.channelId)
    && typeof camera.bandId === 'string' && idPattern.test(camera.bandId)
    && typeof camera.title === 'string' && camera.title.trim().length > 0 && camera.title.length <= 120
    && (camera.fit === 'contain' || camera.fit === 'cover')
}

export function parseCameraOrigin(value: string | undefined, allowLocal: boolean): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.hostname.includes('*') || url.username || url.password || url.search || url.hash || url.pathname !== '/') return null
    if (url.protocol !== 'https:' && !(allowLocal && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return null
    return url.origin
  } catch { return null }
}

export function buildCameraEmbedUrl(source: DeviceCameraSource, parentOrigin: string) {
  const url = new URL(`/embed/${source.binding.channelId}/${source.binding.bandId}`, source.embedOrigin)
  url.search = new URLSearchParams({ autoplay: '1', muted: '1', clock: '1', controls: '0', fit: source.binding.fit, parentOrigin }).toString()
  return url.href
}

export function isCameraStatusMessage(value: unknown, binding: DeviceCameraBinding): value is CameraStatusMessage {
  if (!value || typeof value !== 'object') return false
  const message = value as Partial<CameraStatusMessage>
  return message.type === 'cosmo.embed.status' && message.version === 1
    && message.channelId === binding.channelId && message.bandId === binding.bandId
    && typeof message.muted === 'boolean' && states.has(message.state as CameraPlaybackState)
}
