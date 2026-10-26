import { describe, expect, it } from 'vitest'
import { fixture } from '@/app/dev/voyager-initiation/fixtures'
import { allowsCalibrationReminder, hasConfirmedInitiationPayment, parseCalibrationReminder, shouldInviteCalibration } from './post-payment-calibration'

describe('post-payment Signal Calibration invitation', () => {
  it.each(['initial_pack', 'complete_pack', 'upgraded', 'anonymous_initiated'] as const)('invites an uncalibrated %s buyer after confirmed payment', name => {
    expect(shouldInviteCalibration({ ...fixture(name), calibrated: false })).toBe(true)
  })
  it.each(['guest', 'unpaid', 'granted', 'pending', 'payment_failed', 'canceled', 'refunded', 'disputed', 'payment_review', 'unknown', 'initial_upgrade_pending', 'legacy_pack'] as const)('does not treat %s as a confirmed new purchase', name => {
    expect(shouldInviteCalibration({ ...fixture(name), calibrated: false })).toBe(false)
  })
  it('does not ask an already calibrated buyer again', () => {
    const state = fixture('complete_pack')
    expect(hasConfirmedInitiationPayment(state)).toBe(true)
    expect(shouldInviteCalibration(state)).toBe(false)
  })
  it('requires confirmed payment even if an active membership is already present', () => {
    expect(shouldInviteCalibration({ ...fixture('complete_pack'), calibrated: false, paymentStatus: 'pending' })).toBe(false)
    expect(shouldInviteCalibration({ ...fixture('complete_pack'), calibrated: false, error: 'Records unavailable' })).toBe(false)
  })
})

describe('site-wide reminder boundary', () => {
  it.each(['/', '/console', '/intel/signal', '/devices', '/worlds', '/voyagers', '/profile', '/join/success', '/voyager-initiation'])('checks reminders when entering %s', path => {
    expect(allowsCalibrationReminder(path)).toBe(true)
  })
  it.each(['/login', '/register', '/auth/callback', '/new', '/quiz', '/dev/voyager-initiation', '/admin/orders', '/studio', '/offline'])('does not interrupt %s', path => {
    expect(allowsCalibrationReminder(path)).toBe(false)
  })
  it('accepts only a valid, paid invitation from the server', () => {
    const raw = { status: 'due', promptedAt: '2026-10-23T04:00:00Z', snapshot: { ...fixture('complete_pack'), calibrated: false } }
    expect(parseCalibrationReminder(raw)).toMatchObject({ status: 'due', snapshot: { userId: 'local-preview' } })
    expect(parseCalibrationReminder({ ...raw, snapshot: { ...raw.snapshot, calibrated: true } }).status).toBe('unavailable')
    expect(parseCalibrationReminder({ ...raw, snapshot: { ...raw.snapshot, paymentStatus: 'pending' } }).status).toBe('unavailable')
    expect(parseCalibrationReminder({ ...raw, promptedAt: 'not a date' }).status).toBe('unavailable')
    expect(parseCalibrationReminder(null).status).toBe('unavailable')
  })
  it.each(['completed', 'cooldown', 'ineligible', 'deferred'] as const)('preserves the %s decision without an invitation', status => {
    expect(parseCalibrationReminder({ status })).toEqual({ status })
  })
})
