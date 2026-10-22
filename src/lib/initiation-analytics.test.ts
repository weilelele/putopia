import { describe, expect, it, vi } from 'vitest'
import { createPriceExposureGate, initiationAdContext, initiationAnalyticsProperties, initiationNextStep, sanitizeInitiationAnalytics, visiblePriceRatio } from './initiation-analytics'

describe('Initiation price exposure', () => {
  const setup = () => {
    vi.useFakeTimers()
    let visible = true
    const expose = vi.fn()
    const gate = createPriceExposureGate({ schedule: setTimeout, cancel: timer => clearTimeout(timer as ReturnType<typeof setTimeout>), stillVisible: () => visible, expose })
    return { gate, expose, hide: () => { visible = false } }
  }
  it('requires one full continuous second and fires only once', () => {
    const { gate, expose } = setup()
    gate.update(true); vi.advanceTimersByTime(999); expect(expose).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1); expect(expose).toHaveBeenCalledTimes(1)
    gate.update(true); vi.advanceTimersByTime(2000); expect(expose).toHaveBeenCalledTimes(1)
    gate.dispose(); vi.useRealTimers()
  })
  it.each(['scroll out', 'background tab', 'covered modal', 'lost focus'])('%s restarts exposure', () => {
    const { gate, expose } = setup()
    gate.update(true); vi.advanceTimersByTime(600); gate.update(false); vi.advanceTimersByTime(1000)
    expect(expose).not.toHaveBeenCalled(); gate.update(true); vi.advanceTimersByTime(999); expect(expose).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1); expect(expose).toHaveBeenCalledTimes(1)
    gate.dispose(); vi.useRealTimers()
  })
  it('rechecks eligibility at the timer deadline', () => {
    const { gate, expose, hide } = setup()
    gate.update(true); hide(); vi.advanceTimersByTime(1000); expect(expose).not.toHaveBeenCalled()
    gate.dispose(); vi.useRealTimers()
  })
  it('route unmount cancels pending work', () => {
    const { gate, expose } = setup(); gate.update(true); gate.dispose(); vi.advanceTimersByTime(2000)
    expect(expose).not.toHaveBeenCalled(); vi.useRealTimers()
  })
  it('clips against actual mobile route or desktop shell, never scroll percentage', () => {
    const price = { left: 20, top: 800, right: 120, bottom: 840 }
    expect(visiblePriceRatio(price, { left: 0, top: 0, right: 390, bottom: 820 })).toBe(0.5)
    expect(visiblePriceRatio(price, { left: 0, top: 0, right: 390, bottom: 819 })).toBeLessThan(0.5)
    expect(visiblePriceRatio(price, { left: 0, top: 0, right: 390, bottom: 790 })).toBe(0)
  })
})
describe('Initiation analytics facts', () => {
  it('labels the $38 Initial Pack separately throughout the funnel', () => {
    expect(initiationAnalyticsProperties('initial', { order_kind: 'standard', product_name: 'spoofed', payable_amount: 1 })).toMatchObject({
      product_type: 'voyager_initiation', product_name: 'Initial Voyager Pack', order_kind: 'initial',
      payable_amount: 38, amount_minor: 3800, currency: 'USD', pricing_version: 'voyager-bundles-v1',
    })
  })
  it('reports current $460 upgrades and $488 Complete prices', () => {
    expect(initiationAnalyticsProperties('legacy_upgrade')).toMatchObject({ payable_amount: 460, amount_minor: 46000, order_kind: 'legacy_upgrade', currency: 'USD' })
    expect(initiationAnalyticsProperties('standard')).toMatchObject({ payable_amount: 488, amount_minor: 48800 })
  })
  it('whitelists campaign labels and drops personal data and spoofed pricing', () => {
    expect(sanitizeInitiationAnalytics({ utm_source: 'email', utm_campaign: 'p1-initiation-20261014', utm_content: 'person@example.com', email: 'private@example.com', amount: 1, address: 'hidden', calibration: 'answer' }))
      .toEqual({ utm_source: 'email', utm_campaign: 'p1-initiation-20261014' })
  })
  it('records the actual CTA branch before navigation', () => {
    expect(initiationNextStep('guest', true)).toBe('login')
    expect(initiationNextStep('unpaid', false)).toBe('calibration')
    expect(initiationNextStep('legacy_pack', true)).toBe('checkout')
  })
  it('preserves exact Meta IDs as strings without numeric precision loss', () => {
    expect(sanitizeInitiationAnalytics({ campaign_id: '120253708880830237', adset_id: '120253708881010237', ad_id: '120253708881030237', placement: 'Instagram_Stories' }))
      .toEqual({ campaign_id: '120253708880830237', adset_id: '120253708881010237', ad_id: '120253708881030237', placement: 'Instagram_Stories' })
  })
  it('retains the same ad through login but replaces the entire group on a new click', () => {
    const first = { campaign_id: '1201', adset_id: '1202', ad_id: '1203', placement: 'Facebook_Feed' }
    expect(initiationAdContext({}, first)).toEqual(first)
    expect(initiationAdContext({ ad_id: '2203' }, first)).toEqual({ ad_id: '2203' })
  })
  it('rejects templates, numeric inputs, oversized IDs and private placement strings', () => {
    expect(sanitizeInitiationAnalytics({ campaign_id: '{{campaign.id}}', adset_id: 1202, ad_id: '1'.repeat(31), placement: 'private@example.com' })).toEqual({})
    expect(initiationAdContext({ ad_id: '{{ad.id}}' }, { ad_id: '1203' })).toEqual({})
  })
})
