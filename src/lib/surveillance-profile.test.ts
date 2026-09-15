import { describe, expect, it } from 'vitest'
import { preferredSurveillanceQuality, surveillanceEffectMessage, surveillanceVideoFailureAction, SURVEILLANCE_PROFILES } from './surveillance-profile'

describe('surveillance profiles', () => {
  it('keeps Device A and Worlds B visually distinct', () => {
    expect(SURVEILLANCE_PROFILES['device-a'].standard).toMatchObject({ renderWidth: 320, saturation: 78, softness: 0.45 })
    expect(SURVEILLANCE_PROFILES['worlds-b'].standard).toMatchObject({ renderWidth: 224, saturation: 35, softness: 0.85 })
  })

  it('uses the economy tier for reduced motion or data saving', () => {
    expect(preferredSurveillanceQuality()).toBe('standard')
    expect(preferredSurveillanceQuality({ saveData: true })).toBe('eco')
    expect(preferredSurveillanceQuality({ reducedMotion: true })).toBe('eco')
  })

  it('emits the Device A v2 embed contract', () => {
    expect(surveillanceEffectMessage('standard', { channelId: 'c', bandId: 'b' })).toMatchObject({
      profile: 'surveillance-v2', profileVersion: 2, preset: 'device-a', channelId: 'c', bandId: 'b',
    })
  })

  it('retries a failed canvas source as native video before reporting an error', () => {
    expect(surveillanceVideoFailureAction(true)).toBe('retry-native')
    expect(surveillanceVideoFailureAction(false)).toBe('report-error')
  })
})
