import { describe, expect, it } from 'vitest'
import { deviceCameraEffectDelay, nextDeviceCameraEffect, type DeviceCameraEffectId } from './device-camera-effects'

describe('Device camera effect rotation', () => {
  it('switches to one of the other complete presets without repeating the active mode', () => {
    const modes: DeviceCameraEffectId[] = ['signal-decay', 'chromatic', 'glitch-art']
    for (const current of modes) {
      const first = nextDeviceCameraEffect(current, 0)
      const last = nextDeviceCameraEffect(current, 0.999999)
      expect(first).not.toBe(current)
      expect(last).not.toBe(current)
      expect(modes).toContain(first)
      expect(modes).toContain(last)
    }
  })

  it('keeps each mode between twelve and twenty-two seconds', () => {
    expect(deviceCameraEffectDelay(-1)).toBe(12000)
    expect(deviceCameraEffectDelay(0.5)).toBe(17000)
    expect(deviceCameraEffectDelay(1)).toBe(21999)
  })
})
