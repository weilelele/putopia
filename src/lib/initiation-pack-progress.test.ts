import { describe, expect, it } from 'vitest'
import { fixture } from '@/app/dev/voyager-initiation/fixtures'
import { initiationPackProgress } from './initiation-pack-progress'

describe('purchased Pack delivery progress', () => {
  it('includes only the first two Initial packs and leaves Console + Pack 4 inactive', () => {
    const progress = initiationPackProgress(fixture('initial_pack'))
    expect(progress).toMatchObject({ included: 2, delivered: 0, pending: 2 })
    expect(progress.packs.map(pack => pack.label)).toEqual(['Awaiting dispatch', 'Awaiting dispatch', 'Awaiting activation', 'Awaiting activation'])
  })
  it('does not unlock the last two packs for a pending upgrade', () => {
    const progress = initiationPackProgress(fixture('initial_upgrade_pending'))
    expect(progress.included).toBe(2)
    expect(progress.packs.slice(2).every(pack => pack.awaitingActivation && !pack.claimable)).toBe(true)
  })
  it('shows all four direct-purchase packs, with Console allocation before dispatch', () => {
    const progress = initiationPackProgress(fixture('complete_pack'))
    expect(progress).toMatchObject({ included: 4, delivered: 0, pending: 4 })
    expect(progress.packs[2]).toMatchObject({ claimable: true, label: 'Awaiting Console claim' })
  })
  it('preserves the first two completed deliveries after upgrading', () => {
    const progress = initiationPackProgress(fixture('upgraded'))
    expect(progress).toMatchObject({ included: 4, delivered: 2, pending: 2 })
    expect(progress.packs.slice(0, 2).every(pack => pack.label === 'Delivered')).toBe(true)
  })
  it('counts actual undelivered records regardless of purchase kind', () => {
    const upgraded = fixture('upgraded')
    upgraded.shipments[1].status = 'dispatched'
    expect(initiationPackProgress(upgraded)).toMatchObject({ delivered: 1, pending: 3 })
    const direct = fixture('complete_pack')
    direct.shipments.forEach(pack => { pack.status = 'delivered' })
    expect(initiationPackProgress(direct)).toMatchObject({ delivered: 4, pending: 0 })
  })
  it('does not invent a delivery status when a purchased record is missing', () => {
    const snapshot = fixture('complete_pack')
    snapshot.shipments = snapshot.shipments.filter(pack => pack.position !== 4)
    expect(initiationPackProgress(snapshot)).toMatchObject({ pending: null })
    expect(initiationPackProgress(snapshot).packs[3].label).toBe('Progress unavailable')
  })
  it('stops offering a Console claim after allocation', () => {
    const snapshot = fixture('complete_pack')
    snapshot.consoleClaim.claimed = true
    expect(initiationPackProgress(snapshot).packs[2]).toMatchObject({ claimable: false, label: 'Awaiting dispatch' })
  })
  it('keeps historical deliveries visible but pauses unfulfilled refunded packs', () => {
    const snapshot = fixture('upgraded')
    snapshot.status = 'legacy_pack'
    snapshot.paymentStatus = 'refunded'
    snapshot.consoleClaim.eligible = false
    const progress = initiationPackProgress(snapshot)
    expect(progress).toMatchObject({ included: 2, delivered: 2, pending: 0 })
    expect(progress.packs.map(pack => pack.label)).toEqual(['Delivered', 'Delivered', 'Access paused', 'Access paused'])
    expect(progress.packs.some(pack => pack.claimable)).toBe(false)
  })
  it('does not derive purchase rights from role, grant, or orphaned shipment records', () => {
    const snapshot = fixture('upgraded')
    snapshot.status = 'unknown'
    expect(initiationPackProgress(snapshot)).toMatchObject({ included: 0, pending: null })
    expect(initiationPackProgress(snapshot).packs.some(pack => pack.label === 'Access paused' || pack.claimable)).toBe(false)
    expect(initiationPackProgress(fixture('granted'))).toMatchObject({ included: 0, pending: null })
  })
})
