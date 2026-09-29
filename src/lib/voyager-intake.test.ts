import { describe, expect, it } from 'vitest'
import { EMPTY_INTAKE, JAPAN_PREFECTURES, US_STATES, intakeStepError, isPaidVoyagerPack, parseVoyagerIntake } from './voyager-intake'

const valid = { ...EMPTY_INTAKE, mission: 'b', console: 'b', region: 'California', work: 'Undisclosed', observation: 'A world where the rain falls upwards.' }

describe('Voyager profile validation', () => {
  it('requires all five answers, not a legacy quiz completion flag', () => {
    expect(parseVoyagerIntake(EMPTY_INTAKE)).toBeNull()
    expect(parseVoyagerIntake({ task_quiz_at: '2026-01-01' })).toBeNull()
    expect(parseVoyagerIntake(valid)).toEqual(valid)
  })
  it('accepts any organization answer without scoring or failing the member', () => {
    expect(parseVoyagerIntake({ ...valid, mission: 'a', console: 'd' })).not.toBeNull()
    expect(parseVoyagerIntake({ ...valid, mission: 'x' })).toBeNull()
  })
  it('rejects malformed requests and normalizes whitespace', () => {
    for (const value of [null, [], true, { ...valid, work: 42 }, { ...valid, shareObservation: 'true' }, { ...valid, region: '   ' }]) expect(parseVoyagerIntake(value)).toBeNull()
    expect(parseVoyagerIntake({ ...valid, work: '  Classified  ' })?.work).toBe('Classified')
    expect(parseVoyagerIntake({ ...valid, work: 'x'.repeat(301) })).toBeNull()
    expect(parseVoyagerIntake({ ...valid, observation: 'x'.repeat(2001) })).toBeNull()
  })
  it('requires the region to belong to the selected country', () => {
    expect(parseVoyagerIntake({ ...valid, country: 'Japan' })).toBeNull()
    expect(parseVoyagerIntake({ ...valid, country: 'Japan', region: 'Tokyo' })).not.toBeNull()
    expect(parseVoyagerIntake({ ...valid, country: 'Other' })).toBeNull()
    expect(parseVoyagerIntake({ ...valid, country: 'Other', otherCountry: 'Canada', region: 'Ontario' })).not.toBeNull()
    expect(US_STATES).toHaveLength(51)
    expect(JAPAN_PREFECTURES).toHaveLength(47)
  })
  it('does not require observation consent to finish the profile', () => {
    expect(parseVoyagerIntake(valid)?.shareObservation).toBe(false)
    expect(parseVoyagerIntake({ ...valid, shareObservation: true })?.shareObservation).toBe(true)
    expect(intakeStepError({ ...valid, observation: '' }, 4)).not.toBeNull()
  })
})

describe('Initial Voyager Pack completion', () => {
  it('retains completion after fulfillment progresses', () => {
    for (const status of ['paid', 'preparing', 'shipped', 'delivered']) expect(isPaidVoyagerPack({ status, product_type: 'voyager_pack' })).toBe(true)
  })
  it('does not count device orders, pending payments, refunds or cancellations', () => {
    expect(isPaidVoyagerPack({ status: 'paid', product_type: 'device_batch_claim' })).toBe(false)
    for (const status of ['pending', 'payment_failed', 'payment_review', 'refunded', 'canceled']) expect(isPaidVoyagerPack({ status, product_type: 'voyager_pack' })).toBe(false)
  })
})
