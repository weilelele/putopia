export type DeviceCameraEffectId = 'signal-decay' | 'chromatic' | 'glitch-art'
export type DeviceCameraBaseEffectId = Exclude<DeviceCameraEffectId, 'glitch-art'>

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

/**
 * Glitch Art is a short bridge between the two persistent treatments instead
 * of a third persistent mode: Signal Decay -> Glitch Art -> Chromatic -> …
 */
export function nextDeviceCameraEffect(
  current: DeviceCameraEffectId,
  lastBase: DeviceCameraBaseEffectId,
): DeviceCameraEffectId {
  if (current !== 'glitch-art') return 'glitch-art'
  return lastBase === 'signal-decay' ? 'chromatic' : 'signal-decay'
}

/** Keep base treatments readable, while the transition only flashes for 2–3s. */
export function deviceCameraEffectDelay(effect: DeviceCameraEffectId, random: number) {
  const bounded = Math.max(0, Math.min(random, 1))
  if (effect === 'glitch-art') return 2000 + Math.round(bounded * 1000)
  return 12000 + Math.floor(Math.min(bounded, 0.999999) * 10000)
}
