import { describe, expect, it } from 'vitest'
import { ACTIVATION_CYCLE, activationLightFrame } from './activation-light'

describe('activation spotlight', () => {
  it('holds on the Console longer, with smaller radii on the other packs', () => {
    const frames = [0, 5100, 8020, 10940].map(activationLightFrame)
    expect(frames.map(frame => frame.index)).toEqual([0, 1, 2, 3])
    expect(frames.map(frame => frame.progress)).toEqual([0, 0, 0, 0])
    expect(frames[0].radius).toBeGreaterThan(frames[1].radius)
    expect(frames[1].radius).toBeGreaterThan(frames[2].radius)
    expect(frames[2].radius).toBeGreaterThan(frames[3].radius)
    expect(activationLightFrame(3999).progress).toBe(0)
    expect(activationLightFrame(4550).progress).toBeCloseTo(.5)
  })

  it('has no radius jumps at pack boundaries or when the animation loops', () => {
    for (const boundary of [5100, 8020, 10940, ACTIVATION_CYCLE]) {
      expect(activationLightFrame(boundary - .01).radius).toBeCloseTo(activationLightFrame(boundary).radius, 6)
    }
    expect(activationLightFrame(ACTIVATION_CYCLE)).toEqual(activationLightFrame(0))
  })
})
