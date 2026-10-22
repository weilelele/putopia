import type { InitiationOrderKind, InitiationStatus } from './initiation-types'

/** A newer canceled/pending checkout must not replace the confirmed purchase label. */
export function initiationPurchaseKind(orders: { id: string; status: string; order_kind: string }[] | null, entitlement: { active: boolean; order_id: string } | null, initialOrderId: string | null): InitiationOrderKind | null {
  if (!entitlement?.active) return initialOrderId ? 'initial' : null
  const confirmed = orders?.find(order => order.id === entitlement.order_id && order.status === 'paid')
  return confirmed?.order_kind === 'standard' || confirmed?.order_kind === 'legacy_upgrade' ? confirmed.order_kind : null
}

/** Roster membership is separate from the paid fulfillment entitlement. */
export function initiationMemberStatus(paidEntitlementActive: boolean, member: { source: 'paid' | 'granted'; active: boolean } | null, legacyPackPurchased: boolean): InitiationStatus {
  if (paidEntitlementActive) return 'initiated'
  if (member?.active && member.source === 'granted') return 'granted'
  if (legacyPackPurchased) return 'legacy_pack'
  if (member?.active && member.source === 'paid') return 'unknown' // inconsistent payment/entitlement read
  return legacyPackPurchased ? 'legacy_pack' : 'unpaid'
}

export function parseInitiationAvailability(raw: unknown): { open: boolean; capacity: number; initiated: number; remaining: number; paid: number; granted: number } | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  for (const key of ['capacity', 'initiated', 'remaining', 'paid', 'granted']) {
    if (typeof value[key] !== 'number' || !Number.isSafeInteger(value[key]) || value[key] < 0) return null
  }
  const capacity = value.capacity as number
  const initiated = value.initiated as number
  const remaining = value.remaining as number
  const paid = value.paid as number
  const granted = value.granted as number
  if (capacity !== 100 || initiated > capacity || remaining > capacity || paid + granted !== initiated || remaining + initiated > capacity || typeof value.open !== 'boolean') return null
  return { open: value.open, capacity, initiated, remaining, paid, granted }
}
