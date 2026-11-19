'use client'

import posthog from 'posthog-js'
import { ONBOARDING_SUCCESS_FLAG, ONBOARDING_SUCCESS_STORAGE_KEY, onboardingExperimentEligible, readOnboardingSuccessAssignment, resolveOnboardingSuccessVariant, type OnboardingSuccessVariant } from './onboarding-success-experiment'

export function getOnboardingSuccessAnalytics() {
  try {
    if (posthog.has_opted_out_capturing()) return {}
    const assignment = readOnboardingSuccessAssignment(localStorage.getItem(ONBOARDING_SUCCESS_STORAGE_KEY), posthog.get_property('$device_id'))
    return assignment ? { onboarding_success_variant: assignment.variant, onboarding_success_device_id: assignment.deviceId } : {}
  } catch { return {} }
}

/** Only successful submissions enroll; an old pending-email screen cannot join. */
export async function evaluateOnboardingSuccessExperiment(input: {
  environment: string; qa: boolean; internal: boolean; returning?: boolean
}): Promise<OnboardingSuccessVariant | null> {
  try {
    if (!onboardingExperimentEligible({ ...input, optedOut: posthog.has_opted_out_capturing() })) return null
    if (input.returning && !getOnboardingSuccessAnalytics().onboarding_success_variant) return null
    const variant = await resolveOnboardingSuccessVariant({
      readFlag: () => posthog.getFeatureFlag(ONBOARDING_SUCCESS_FLAG, { send_event: false }),
      onFlags: callback => posthog.onFeatureFlags((_flags, _variants, context) => callback(context?.errorsLoading === true)),
      schedule: (callback, ms) => setTimeout(callback, ms),
      cancel: timer => clearTimeout(timer as ReturnType<typeof setTimeout>),
    })
    if (!variant || posthog.has_opted_out_capturing()) return null
    // Native exposure is emitted only here, after the application was saved.
    // Reading on other pages would enroll visitors who never saw this change.
    if (posthog.getFeatureFlag(ONBOARDING_SUCCESS_FLAG) !== variant) return null
    const deviceId = posthog.get_property('$device_id')
    if (typeof deviceId === 'string' && deviceId) {
      try { localStorage.setItem(ONBOARDING_SUCCESS_STORAGE_KEY, JSON.stringify({ variant, deviceId })) } catch { /* The current visit still works without storage. */ }
    }
    return variant
  } catch { return null }
}
