import { INITIATION_AMOUNT, INITIATION_UPGRADE_AMOUNT, type InitiationOrderKind } from './initiation-types'

/** Immutable purchase facts shared by checkout, reconciliation and analytics. */
export const INITIATION_OFFERS = {
  standard: { amount: INITIATION_AMOUNT, priceEnv: 'STRIPE_INITIATION_PRICE_ID', packs: [1, 2, 3, 4] },
  legacy_upgrade: { amount: INITIATION_UPGRADE_AMOUNT, priceEnv: 'STRIPE_INITIATION_UPGRADE_PRICE_ID', packs: [3, 4] },
  initial: { amount: 4800, priceEnv: 'STRIPE_INITIATION_INITIAL_PRICE_ID', packs: [1, 2] },
  initial_upgrade: { amount: 50000, priceEnv: 'STRIPE_INITIATION_INITIAL_UPGRADE_PRICE_ID', packs: [3, 4] },
} as const

export function initiationOffer(kind: unknown) {
  return typeof kind === 'string' && Object.hasOwn(INITIATION_OFFERS, kind)
    ? INITIATION_OFFERS[kind as InitiationOrderKind] : null
}

/** The browser requests a bundle, never its price or an eligibility tier. */
export function resolveInitiationOffer(requested: unknown, facts: { legacy: boolean; initial: boolean; bundlesEnabled: boolean }): InitiationOrderKind | null {
  if (requested !== undefined && requested !== 'initial' && requested !== 'complete') return null
  if (facts.legacy) return requested === 'initial' ? null : 'legacy_upgrade'
  if (facts.initial) return requested === 'initial' || !facts.bundlesEnabled ? null : 'initial_upgrade'
  if (requested === 'initial') return facts.bundlesEnabled ? 'initial' : null
  return 'standard'
}
