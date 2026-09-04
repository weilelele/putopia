import { describe, expect, it } from 'vitest'
import { deviceCameraEffectDelay, nextDeviceCameraEffect } from './device-camera-effects'

describe('Device camera effect rotation', () => {
  it('uses Glitch Art as the bridge between the two persistent modes', () => {
    expect(nextDeviceCameraEffect('signal-decay', 'signal-decay')).toBe('glitch-art')
    expect(nextDeviceCameraEffect('glitch-art', 'signal-decay')).toBe('chromatic')
    expect(nextDeviceCameraEffect('chromatic', 'chromatic')).toBe('glitch-art')
    expect(nextDeviceCameraEffect('glitch-art', 'chromatic')).toBe('signal-decay')
  })

  it('keeps base modes readable and Glitch Art between two and three seconds', () => {
    expect(deviceCameraEffectDelay('signal-decay', -1)).toBe(12000)
    expect(deviceCameraEffectDelay('chromatic', 0.5)).toBe(17000)
    expect(deviceCameraEffectDelay('signal-decay', 1)).toBe(21999)
    expect(deviceCameraEffectDelay('glitch-art', -1)).toBe(2000)
    expect(deviceCameraEffectDelay('glitch-art', 0.5)).toBe(2500)
    expect(deviceCameraEffectDelay('glitch-art', 1)).toBe(3000)
  })
})
