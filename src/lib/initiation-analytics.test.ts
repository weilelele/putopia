import { describe, expect, it, vi } from 'vitest'
import { createPriceExposureGate, initiationAnalyticsProperties, initiationNextStep, sanitizeInitiationAnalytics, visiblePriceRatio } from './initiation-analytics'

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
  it('reports actual legacy $400, never the struck original $520', () => {
    expect(initiationAnalyticsProperties('legacy_upgrade')).toMatchObject({ payable_amount: 400, amount_minor: 40000, order_kind: 'legacy_upgrade', currency: 'USD' })
    expect(initiationAnalyticsProperties('standard')).toMatchObject({ payable_amount: 520, amount_minor: 52000 })
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
})
