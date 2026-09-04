export type DeviceCameraEffectId = 'signal-decay' | 'chromatic' | 'glitch-art'

export type DeviceCameraEffectSettings = {
  effect: DeviceCameraEffectId
  strength: number
  jitter: number
  noise: number
  scanlines: number
  colorShift: number
  flutter: number
  burst: false
}

export const DEVICE_CAMERA_EFFECTS: Record<DeviceCameraEffectId, DeviceCameraEffectSettings> = {
  'signal-decay': { effect: 'signal-decay', strength: 58, jitter: 4, noise: 34, scanlines: 30, colorShift: 10, flutter: 12, burst: false },
  chromatic: { effect: 'chromatic', strength: 64, jitter: 7, noise: 16, scanlines: 10, colorShift: 62, flutter: 9, burst: false },
  'glitch-art': { effect: 'glitch-art', strength: 82, jitter: 14, noise: 28, scanlines: 16, colorShift: 48, flutter: 20, burst: false },
}

const effectIds = Object.keys(DEVICE_CAMERA_EFFECTS) as DeviceCameraEffectId[]

/** Selects one of the other two modes, so a random tick always causes a visible change. */
export function nextDeviceCameraEffect(current: DeviceCameraEffectId, random: number) {
  const alternatives = effectIds.filter((effect) => effect !== current)
  return alternatives[Math.min(alternatives.length - 1, Math.floor(Math.max(0, random) * alternatives.length))]
}

/** Keep each complete treatment visible long enough to read before switching. */
export function deviceCameraEffectDelay(random: number) {
  return 12000 + Math.floor(Math.max(0, Math.min(random, 0.999999)) * 10000)
}
