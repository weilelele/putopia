import { initiationMemberStatus, parseInitiationAvailability } from './initiation-membership'
import { INITIATION_BATCH } from './initiation-types'

/** The former preflight rules, evaluated inside the authenticated checkout request. */
export function initiationCheckoutAccess(input: {
  supply: unknown
  entitlement: { active: boolean } | null
  member: { source: 'paid' | 'granted'; active: boolean; batch: string } | null
  ownsInitial: boolean
  configError: string | null
}) {
  const supply = parseInitiationAvailability(input.supply)
  if (!supply) throw new Error('Checkout supply is unavailable')
  const { entitlement, member, ownsInitial, configError } = input
  const status = initiationMemberStatus(!!entitlement?.active, member, ownsInitial)
  const hasCapacity = supply.remaining > 0 || (ownsInitial && member?.batch === INITIATION_BATCH)
  const checkoutOpen = supply.open && hasCapacity && !configError && !entitlement && status !== 'granted' && status !== 'unknown'
  const message = status === 'unknown' ? 'Your membership records are unavailable. Please try again.'
    : status === 'granted' ? 'Your granted S26 membership is already registered. No payment is required to register it again.'
    : status === 'initiated' ? 'Your Initiation is already confirmed. Refresh this page to view your deliveries and Console claim.'
    : !supply.open ? 'Initiation checkout is not open yet.'
    : !hasCapacity ? 'All S26 seats are currently allocated or reserved.'
    : entitlement && !entitlement.active ? 'Your earlier Console payment needs review. Please contact support before another upgrade.'
    : configError ?? 'Continue to secure checkout.'
  return { status, checkoutOpen, message }
}
