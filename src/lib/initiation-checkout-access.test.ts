import { describe, expect, it } from 'vitest'
import { initiationCheckoutAccess } from './initiation-checkout-access'
const base = { supply: { open: true, capacity: 100, initiated: 20, remaining: 80, paid: 20, granted: 0 }, entitlement: null, member: null, ownsInitial: false, configError: null }
describe('access checks inside checkout', () => {
  it('allows an unpaid applicant without calibration', () => {
    expect(initiationCheckoutAccess(base)).toMatchObject({ status: 'unpaid', checkoutOpen: true })
  })
  it.each([true, false])('blocks existing entitlements even when active=%s', active => {
    expect(initiationCheckoutAccess({ ...base, entitlement: { active } }).checkoutOpen).toBe(false)
  })
  it.each(['granted', 'paid'] as const)('blocks %s roster records without a consistent upgrade', source => {
    expect(initiationCheckoutAccess({ ...base, member: { source, active: true, batch: 'S26' } }).checkoutOpen).toBe(false)
  })
  it('preserves an existing Initial owner’s upgrade seat in a full batch', () => {
    expect(initiationCheckoutAccess({ ...base, supply: { ...base.supply, initiated: 100, remaining: 0, paid: 100 },
      ownsInitial: true, member: { source: 'paid', active: true, batch: 'S26' } })).toMatchObject({ status: 'legacy_pack', checkoutOpen: true })
  })
  it.each(['closed', 'full', 'configuration'])('blocks %s checkout', problem => {
    expect(initiationCheckoutAccess({ ...base,
      supply: { ...base.supply, open: problem !== 'closed', remaining: problem === 'full' ? 0 : 80 },
      configError: problem === 'configuration' ? 'Missing price' : null }).checkoutOpen).toBe(false)
  })
  it('does not count a different batch as an upgrade seat', () => {
    expect(initiationCheckoutAccess({ ...base, supply: { ...base.supply, remaining: 0 }, ownsInitial: true,
      member: { source: 'paid', active: true, batch: 'S25' } }).checkoutOpen).toBe(false)
  })
  it.each([null, {}, { ...base.supply, open: 'yes' }, { ...base.supply, capacity: 999 }])('rejects malformed availability', supply => {
    expect(() => initiationCheckoutAccess({ ...base, supply })).toThrow()
  })
})
