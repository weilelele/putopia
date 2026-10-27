import { describe, expect, it } from 'vitest'
import { EMAIL_CHECKOUT_LIMITS, emailCheckoutGate, emailCheckoutOwnership } from './initiation-email-checkout'

describe('emailCheckoutGate', () => {
  const open = { ip: '203.0.113.7', recentFromIp: 0 }

  it('lets a new email continue straight to payment', () => {
    expect(emailCheckoutGate(open)).toBe('checkout')
  })

  it('asks for activation first once an IP reaches the hourly limit', () => {
    expect(emailCheckoutGate({ ...open, recentFromIp: EMAIL_CHECKOUT_LIMITS.perIpPerHour - 1 })).toBe('checkout')
    expect(emailCheckoutGate({ ...open, recentFromIp: EMAIL_CHECKOUT_LIMITS.perIpPerHour })).toBe('activate_first')
  })

  it('fails closed when the IP or a count is unknown', () => {
    expect(emailCheckoutGate({ ...open, ip: null })).toBe('activate_first')
    expect(emailCheckoutGate({ ...open, recentFromIp: null })).toBe('activate_first')
  })
})

describe('emailCheckoutOwnership', () => {
  const none = { entitlement: false, member: false, upgradeEligible: false }

  it('lets an account without a purchase choose either bundle', () => {
    expect(emailCheckoutOwnership(none)).toBe('none')
  })

  it('stops a paid member or a granted member from paying again', () => {
    expect(emailCheckoutOwnership({ ...none, entitlement: true, member: true })).toBe('already_member')
    expect(emailCheckoutOwnership({ ...none, member: true })).toBe('already_member')
  })

  it('offers only the upgrade to an owner of Packs 1–2', () => {
    expect(emailCheckoutOwnership({ ...none, member: true, upgradeEligible: true })).toBe('upgrade')
    expect(emailCheckoutOwnership({ ...none, upgradeEligible: true })).toBe('upgrade')
  })

  it('treats a completed upgrade as a full member', () => {
    expect(emailCheckoutOwnership({ entitlement: true, member: true, upgradeEligible: true })).toBe('already_member')
  })
})
