export const ONBOARDING_SUCCESS_FLAG = 'onboarding-initiation-success-v1'
export const ONBOARDING_SUCCESS_STORAGE_KEY = 'mc:onboarding:success-experiment:v1'
export type OnboardingSuccessVariant = 'control' | 'test'
export type OnboardingSuccessAssignment = { variant: OnboardingSuccessVariant; deviceId: string }

export function onboardingSuccessVariant(value: unknown): OnboardingSuccessVariant | null {
  return value === 'control' || value === 'test' ? value : null
}

export function onboardingSuccessExposureProperties(value: unknown) {
  const variant = onboardingSuccessVariant(value)
  return variant ? { onboarding_success_experiment: ONBOARDING_SUCCESS_FLAG,
    onboarding_success_variant: variant, [`$feature/${ONBOARDING_SUCCESS_FLAG}`]: variant } : {}
}

export function onboardingExperimentEligible(input: { environment: string; qa: boolean; internal: boolean; optedOut: boolean }) {
  return input.environment === 'production' && !input.qa && !input.internal && !input.optedOut
}

export function readOnboardingSuccessAssignment(raw: string | null, deviceId: unknown): OnboardingSuccessAssignment | null {
  if (!raw || typeof deviceId !== 'string' || !deviceId) return null
  try {
    const value = JSON.parse(raw)
    const variant = onboardingSuccessVariant(value?.variant)
    return variant && value.deviceId === deviceId ? { variant, deviceId } : null
  } catch { return null }
}

/** Missing/failed flags are unassigned, never a synthetic control exposure. */
export function resolveOnboardingSuccessVariant(deps: {
  readFlag: () => unknown
  onFlags: (callback: (failed: boolean) => void) => () => void
  schedule: (callback: () => void, ms: number) => unknown
  cancel: (timer: unknown) => void
}): Promise<OnboardingSuccessVariant | null> {
  return new Promise(resolve => {
    let finished = false
    let timer: unknown
    let unsubscribe = () => {}
    const finish = (variant: OnboardingSuccessVariant | null) => {
      if (finished) return
      finished = true
      if (timer !== undefined) deps.cancel(timer)
      unsubscribe()
      resolve(variant)
    }
    try {
      const cached = deps.readFlag()
      if (cached !== undefined) { finish(onboardingSuccessVariant(cached)); return }
      timer = deps.schedule(() => finish(null), 1500)
      unsubscribe = deps.onFlags(failed => {
        try { finish(failed ? null : onboardingSuccessVariant(deps.readFlag())) } catch { finish(null) }
      })
      // SDK callbacks may run synchronously when flags are already loaded.
      if (finished) unsubscribe()
    } catch { finish(null) }
  })
}
