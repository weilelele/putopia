/** Public, serializable A/B contract. Roles never establish payment. */
export type InitiationStatus = 'guest' | 'unpaid' | 'legacy_pack' | 'initiated' | 'granted' | 'unknown'
export type InitiationPaymentStatus = 'none' | 'pending' | 'paid' | 'payment_failed' | 'canceled' | 'refunded' | 'disputed' | 'payment_review' | 'unknown'
export interface InitiationShipment {
  position: number
  id: string
  title: string
  scheduledMonth: string | null
  status: 'planned' | 'preparing' | 'dispatched' | 'delivered'
  trackingUrl: string | null
  source: 'initiation' | 'legacy_pack'
}
export interface InitiationSnapshot {
  userId: string | null
  role: string
  calibrated: boolean
  status: InitiationStatus
  membershipSource?: 'paid' | 'granted' | null
  availability: { remaining?: number | null; paid?: number | null; granted?: number | null; batch: string; capacity: number; initiated: number | null; checkoutOpen: boolean; reason: string | null }
  shipments: InitiationShipment[]
  consoleClaim: { eligible: boolean; claimed: boolean; href: string | null; batch?: { slug: string; name: string } | null }
  offer?: { kind: InitiationOrderKind; amount: number; currency: 'usd' }
  legacyPackPurchased: boolean
  paymentStatus: InitiationPaymentStatus
  error: string | null
}
export const INITIATION_PRODUCT = 'voyager_initiation'
export const INITIATION_BATCH = 'S26'
export type InitiationOrderKind = 'standard' | 'legacy_upgrade'
export const INITIATION_UPGRADE_AMOUNT = 40000
export const INITIATION_AMOUNT = 52000
export const INITIATION_CAPACITY = 100

export interface InitiationConsoleClaimResult {
  error: string | null
  code: 'claimed' | 'already_claimed' | 'login_required' | 'ineligible' | 'waiting_for_capacity' | 'unavailable'
  orderId?: string
  unitCode?: string
}

export interface InitiationPublicMember {
  id: string
  displayName: string
  avatarUrl: string | null
}
