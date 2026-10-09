import type { InitiationSnapshot } from '@/lib/initiation-types'

export const fixtureNames = ['guest', 'granted', 'unpaid', 'calibrated', 'legacy_pack', 'initiated', 'claimed', 'both', 'architect', 'sold_out', 'pending', 'payment_failed', 'canceled', 'refunded', 'disputed', 'payment_review', 'unknown'] as const
export type FixtureName = typeof fixtureNames[number]
export function fixture(name: FixtureName): InitiationSnapshot {
  const initiated = ['initiated', 'claimed', 'both'].includes(name)
  const legacy = name === 'legacy_pack' || name === 'both'
  return {
    userId: name === 'guest' ? null : 'local-preview', role: name === 'architect' ? 'architect' : initiated || legacy || name === 'granted' ? 'voyager' : 'applicant',
    calibrated: !['guest', 'unpaid'].includes(name), status: name === 'granted' ? 'granted' : name === 'unknown' ? 'unknown' : initiated ? 'initiated' : legacy ? 'legacy_pack' : name === 'guest' ? 'guest' : 'unpaid',
    availability: { batch: 'S26', capacity: 100, initiated: name === 'unknown' ? null : name === 'sold_out' ? 100 : name === 'granted' ? 1 : 26, checkoutOpen: false, reason: 'Fixture checkout never creates a transaction.' },
    consoleClaim: { eligible: initiated, claimed: name === 'claimed', href: initiated ? name === 'claimed' ? '/devices/my-consoles' : '/devices' : null, batch: name === 'claimed' ? { slug: 'kyoto-one', name: 'Kyoto One' } : null },
    legacyPackPurchased: legacy,
    offer: { kind: legacy ? 'legacy_upgrade' : 'standard', amount: legacy ? 40000 : 52000, currency: 'usd' },
    paymentStatus: name === 'unknown' ? 'unknown' : name === 'pending' ? 'pending' : name === 'payment_failed' ? 'payment_failed' : name === 'refunded' ? 'refunded' : name === 'canceled' ? 'canceled' : name === 'disputed' ? 'disputed' : name === 'payment_review' ? 'payment_review' : initiated ? 'paid' : 'none',
    error: name === 'unknown' ? 'Your Initiation records are temporarily unavailable. Please try again.' : null,
    shipments: [
      ...(initiated ? ['Initial Voyager Pack', 'Mysterious Widgets', 'Multiverse Console', 'A Fourth Delivery'].map((title, i) => ({ id: `fixture-${i}`, position: i + 1, title, scheduledMonth: ['2026-10', '2026-11', '2026-12', '2027-01'][i], status: (['delivered', 'dispatched', 'preparing', 'planned'] as const)[i], trackingUrl: null, source: 'initiation' as const })) : []),
      ...(legacy && !initiated ? [1, 2].map((position) => ({ id: `fixture-legacy-${position}`, position, title: `Initiation Pack ${position}`, scheduledMonth: position === 1 ? '2026-10' : '2026-11', status: 'planned' as const, trackingUrl: null, source: 'legacy_pack' as const })) : []),
    ],
  }
}
