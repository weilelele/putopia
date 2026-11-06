import { describe, expect, it } from 'vitest'
import { canSubmitObservation } from './observation-access-model'

describe('observation submission access', () => {
  it('admits Voyagers and Architects without a paid order', () => {
    expect(canSubmitObservation('voyager', false)).toBe(true)
    expect(canSubmitObservation('architect', false)).toBe(true)
  })
  it('admits applicants only with a paid order', () => {
    expect(canSubmitObservation('applicant', true)).toBe(true)
    expect(canSubmitObservation('applicant', false)).toBe(false)
  })
  it('rejects a missing profile', () => {
    expect(canSubmitObservation(null, true)).toBe(false)
    expect(canSubmitObservation(undefined, false)).toBe(false)
  })
})
