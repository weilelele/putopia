export type SurveillancePreset = 'device-a' | 'worlds-b'
export type SurveillanceQuality = 'standard' | 'eco'

export type SurveillanceProfile = {
  preset: SurveillancePreset
  quality: SurveillanceQuality
  renderWidth: number
  maxFps: number
  softness: number
  saturation: number
  contrast: number
  noise: number
}

export const SURVEILLANCE_PROFILES: Record<SurveillancePreset, Record<SurveillanceQuality, SurveillanceProfile>> = {
  'device-a': {
    standard: { preset: 'device-a', quality: 'standard', renderWidth: 320, maxFps: 18, softness: 0.45, saturation: 78, contrast: 94, noise: 2 },
    eco: { preset: 'device-a', quality: 'eco', renderWidth: 224, maxFps: 12, softness: 0.55, saturation: 78, contrast: 94, noise: 0 },
  },
  'worlds-b': {
    standard: { preset: 'worlds-b', quality: 'standard', renderWidth: 224, maxFps: 15, softness: 0.85, saturation: 35, contrast: 88, noise: 5 },
    eco: { preset: 'worlds-b', quality: 'eco', renderWidth: 192, maxFps: 12, softness: 0.9, saturation: 35, contrast: 88, noise: 0 },
  },
}

export function preferredSurveillanceQuality({ reducedMotion = false, saveData = false } = {}): SurveillanceQuality {
  return reducedMotion || saveData ? 'eco' : 'standard'
}

export function surveillanceEffectMessage(
  quality: SurveillanceQuality,
  binding: { channelId: string; bandId: string },
) {
  const profile = SURVEILLANCE_PROFILES['device-a'][quality]
  return {
    type: 'cosmo.embed.effects' as const,
    version: 1 as const,
    profile: 'surveillance-v2' as const,
    profileVersion: 2 as const,
    channelId: binding.channelId,
    bandId: binding.bandId,
    effect: 'signal-decay' as const,
    strength: 0,
    jitter: 0,
    scanlines: 0,
    colorShift: 0,
    flutter: 0,
    burst: false,
    ...profile,
  }
}
