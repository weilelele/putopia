import { afterEach, describe, expect, it, vi } from 'vitest'
import { onboardingExperimentEligible, onboardingSuccessExposureProperties, onboardingSuccessIdentityAction, readOnboardingSuccessAssignment, resolveOnboardingSuccessVariant } from './onboarding-success-experiment'

afterEach(() => vi.useRealTimers())

describe('onboarding success experiment eligibility and continuity', () => {
  const production = { environment: 'production', qa: false, internal: false, optedOut: false }
  it('aligns the enrollment identity with the later Initiation identity without changing browser assignment', () => {
    expect(onboardingSuccessIdentityAction(undefined, 'old-account', 'old-account')).toBe('reset')
    expect(onboardingSuccessIdentityAction(undefined, 'anonymous', undefined)).toBe('none')
    expect(onboardingSuccessIdentityAction('account', 'anonymous', undefined)).toBe('identify')
    expect(onboardingSuccessIdentityAction('account', 'account', 'account')).toBe('none')
  })
  it('labels successful-submission exposure only for a real assigned variant', () => {
    expect(onboardingSuccessExposureProperties('test')).toEqual({ onboarding_success_experiment: 'onboarding-initiation-success-v1',
      onboarding_success_variant: 'test', '$feature/onboarding-initiation-success-v1': 'test' })
    expect(onboardingSuccessExposureProperties(null)).toEqual({})
    expect(onboardingSuccessExposureProperties(false)).toEqual({})
  })
  it('only enrolls production traffic with analytics consent', () => {
    expect(onboardingExperimentEligible(production)).toBe(true)
    for (const override of [{ environment: 'preview' }, { environment: 'unknown' }, { qa: true }, { internal: true }, { optedOut: true }]) {
      expect(onboardingExperimentEligible({ ...production, ...override })).toBe(false)
    }
  })
  it('restores only a valid enrollment for this browser, regardless of login ID', () => {
    const raw = JSON.stringify({ variant: 'test', deviceId: 'browser-one', email: 'not-retained@example.com' })
    expect(readOnboardingSuccessAssignment(raw, 'browser-one')).toEqual({ variant: 'test', deviceId: 'browser-one' })
    expect(readOnboardingSuccessAssignment(raw, 'browser-two')).toBeNull()
    expect(readOnboardingSuccessAssignment(null, 'browser-one')).toBeNull()
    expect(readOnboardingSuccessAssignment('{broken', 'browser-one')).toBeNull()
    expect(readOnboardingSuccessAssignment(JSON.stringify({ variant: 'other', deviceId: 'browser-one' }), 'browser-one')).toBeNull()
  })
})

describe('onboarding success flag resolution', () => {
  function setup(initial: unknown = undefined) {
    vi.useFakeTimers()
    let value = initial
    let loaded: (failed: boolean) => void = () => {}
    const unsubscribe = vi.fn()
    const readFlag = vi.fn(() => value)
    const onFlags = vi.fn((callback: (failed: boolean) => void) => { loaded = callback; return unsubscribe })
    const result = resolveOnboardingSuccessVariant({ readFlag, onFlags, schedule: setTimeout, cancel: timer => clearTimeout(timer as ReturnType<typeof setTimeout>) })
    return { result, readFlag, onFlags, unsubscribe, load(next: unknown, failed = false) { value = next; loaded(failed) } }
  }
  it.each(['control', 'test'] as const)('uses a resolved %s value without waiting', async variant => {
    const state = setup(variant)
    expect(await state.result).toBe(variant)
    expect(state.onFlags).not.toHaveBeenCalled()
  })
  it('waits for first-visit flags and removes the subscription after resolution', async () => {
    const state = setup()
    vi.advanceTimersByTime(500)
    state.load('test')
    expect(await state.result).toBe('test')
    expect(state.unsubscribe).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
  it.each([false, true, 'unknown', null])('never treats %s as a control assignment', async value => {
    expect(await setup(value).result).toBeNull()
  })
  it('times out without enrollment and ignores late results', async () => {
    const state = setup()
    vi.advanceTimersByTime(1500)
    expect(await state.result).toBeNull()
    state.load('test')
    expect(state.unsubscribe).toHaveBeenCalledOnce()
  })
  it('excludes failed flag responses even if the cache has a test value', async () => {
    const state = setup()
    state.load('test', true)
    expect(await state.result).toBeNull()
  })
  it('cleans up when the SDK invokes its callback synchronously', async () => {
    const unsubscribe = vi.fn()
    let ready = false
    const result = resolveOnboardingSuccessVariant({
      readFlag: () => ready ? 'test' : undefined,
      onFlags(callback) { ready = true; callback(false); return unsubscribe },
      schedule: setTimeout, cancel: timer => clearTimeout(timer as ReturnType<typeof setTimeout>),
    })
    expect(await result).toBe('test')
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})
