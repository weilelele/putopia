import { describe, expect, it } from 'vitest'
import {
  BRIEFING_PAGES, BRIEFING_VERSION, briefingAudience, briefingLoopWindow, briefingSoundOn, briefingLinkOpens, briefingOffers, briefingRecord, briefingRegions, briefingSeats,
  clampBriefingPage, readBriefingRecord, shouldAutoOpenBriefing,
} from './initiation-briefing'

describe('Voyager briefing audience', () => {
  it('shows only to people still deciding whether to join', () => {
    expect(['guest', 'unpaid', 'legacy_pack'].every(status => briefingAudience(status as never))).toBe(true)
    expect(['initiated', 'granted', 'unknown'].some(status => briefingAudience(status as never))).toBe(false)
  })

  it('opens once per version and never over a payment outcome', () => {
    const base = { status: 'unpaid' as const, paymentStatus: 'none' as const, checkoutCanceled: false, stored: null }
    expect(shouldAutoOpenBriefing(base)).toBe(true)
    expect(shouldAutoOpenBriefing({ ...base, stored: briefingRecord('skipped', 3) })).toBe(false)
    expect(shouldAutoOpenBriefing({ ...base, stored: JSON.stringify({ version: 'older', outcome: 'closed', page: 1 }) })).toBe(true)
    expect(shouldAutoOpenBriefing({ ...base, checkoutCanceled: true })).toBe(false)
    expect(shouldAutoOpenBriefing({ ...base, paymentStatus: 'pending' })).toBe(false)
    expect(shouldAutoOpenBriefing({ ...base, status: 'initiated' })).toBe(false)
    expect(shouldAutoOpenBriefing({ ...base, stored: 'not json' })).toBe(true)
  })

  it('opens from the direct link only for the same audience', () => {
    expect(briefingLinkOpens('guest', '1')).toBe(true)
    expect(briefingLinkOpens('legacy_pack', '1')).toBe(true)
    expect(briefingLinkOpens('unpaid', undefined)).toBe(false)
    expect(briefingLinkOpens('unpaid', 'yes')).toBe(false)
    expect(briefingLinkOpens('initiated', '1')).toBe(false)
  })

  it('stores a bounded, versioned record', () => {
    expect(readBriefingRecord(briefingRecord('completed', 99))).toEqual({ version: BRIEFING_VERSION, outcome: 'completed', page: BRIEFING_PAGES.length - 1 })
    expect(readBriefingRecord('{"page":2}')).toBeNull()
    expect(clampBriefingPage(-4)).toBe(0)
  })
})

describe('Voyager briefing content', () => {
  it('offers the same choices and prices as the checkout panel', () => {
    expect(briefingOffers('unpaid').map(o => [o.id, o.price, o.recommended])).toEqual([['initial', 38], ['standard', 488]].map(([id, price]) => [id, price, id === 'standard']))
    expect(briefingOffers('guest').map(o => o.id)).toEqual(['initial', 'standard'])
    expect(briefingOffers('unpaid')[0].note).toBe('Add Console + Pack 4 later for $460.')
    expect(briefingOffers('unpaid')[1].note).toBe('Save $10 versus upgrading later.')
    for (const offer of briefingOffers('unpaid')) expect(offer.points[0]).toBe('Collective membership privileges')
    const upgrade = briefingOffers('legacy_pack')
    expect(upgrade).toHaveLength(1)
    expect(upgrade[0]).toMatchObject({ id: 'legacy_upgrade', price: 460, title: 'Console + Pack 4' })
  })

  it('lists open regions first with their published phase', () => {
    const regions = briefingRegions([
      { location: 'Shanghai, China', status: 'searching' },
      { location: 'Kyoto, Japan', status: 'claiming' },
      { location: 'Kyoto restoration room', status: 'searching' },
      { location: 'Kyoto, Japan', status: 'searching' },
      { location: '', status: 'searching' },
    ])
    expect(regions.map(r => [r.name, r.open, r.phase])).toEqual([['KYOTO', true, 2], ['SHANGHAI', false, 1], ['KYOTO RESTORATION ROOM', false, 1]])
    expect(regions[0].phaseLabel).toBe('Claiming')
    expect(briefingRegions(Array.from({ length: 9 }, (_, i) => ({ location: `City ${i}`, status: 'searching' as const }))).length).toBe(5)
  })

  it('never invents seat counts', () => {
    expect(briefingSeats(100, 37)).toEqual({ total: 100, taken: 37, next: 37, known: true })
    expect(briefingSeats(100, null)).toEqual({ total: 100, taken: 0, next: 0, known: false })
    expect(briefingSeats(100, 140)).toEqual({ total: 100, taken: 100, next: null, known: true })
  })
})

describe('Voyager briefing theme', () => {
  it('plays unless this browser turned it off', () => {
    expect(briefingSoundOn(null)).toBe(true)
    expect(briefingSoundOn('on')).toBe(true)
    expect(briefingSoundOn('off')).toBe(false)
  })

  it('skips decoder priming and loops exactly the composed length', () => {
    const rate = 1000, samples = new Float32Array(rate * 3)
    samples.fill(.2, 50)
    expect(briefingLoopWindow(samples, rate, 2)).toEqual({ start: .05, end: 2.05 })
    expect(briefingLoopWindow(new Float32Array(rate * 3).fill(.2), rate, 2)).toEqual({ start: 0, end: 2 })
  })

  it('never loops past the decoded audio or treats a silent file as primed', () => {
    const rate = 1000
    expect(briefingLoopWindow(new Float32Array(rate * 3), rate, 2)).toEqual({ start: 0, end: 2 })
    expect(briefingLoopWindow(new Float32Array(rate).fill(.2), rate, 2)).toEqual({ start: 0, end: 1 })
  })
})
