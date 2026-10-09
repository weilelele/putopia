'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { initiationMemberStatus, parseInitiationAvailability } from '@/lib/initiation-membership'
import { initiationClaimResult } from '@/lib/initiation-claim'
import { initiationConfigurationError } from '@/lib/initiation-config'
import { INITIATION_BATCH, INITIATION_CAPACITY, INITIATION_AMOUNT, INITIATION_UPGRADE_AMOUNT, type InitiationSnapshot, type InitiationPaymentStatus, type InitiationShipment, type InitiationConsoleClaimResult } from '@/lib/initiation-types'
import { VOYAGER_PROFILE_VERSION } from '@/lib/voyager-intake'

/** No caller-supplied user ID. Failures are unknown, never unpaid or zero seats. */
export async function getInitiationSnapshot(): Promise<InitiationSnapshot> {
  const snapshot: InitiationSnapshot = {
    userId: null, role: 'guest', calibrated: false, status: 'unknown',
    availability: { batch: INITIATION_BATCH, capacity: INITIATION_CAPACITY, initiated: null, checkoutOpen: false, reason: initiationConfigurationError() },
    shipments: [], consoleClaim: { eligible: false, claimed: false, href: null },
    legacyPackPurchased: false, paymentStatus: 'unknown', error: null,
  }
  try {
    const client = await createClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError && authError.name !== 'AuthSessionMissingError') throw authError
    snapshot.userId = user?.id ?? null
    snapshot.status = user ? 'unknown' : 'guest'
    // schema_v83 has private tables; the verified session determines ownership.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    const { data: supplyData, error: supplyError } = await admin.rpc('initiation_availability')
    const supply = parseInitiationAvailability(supplyData)
    if (supplyError || !supply) {
      snapshot.availability.reason = 'Initiation inventory is temporarily unavailable.'
    } else {
      snapshot.availability.initiated = supply.initiated
      snapshot.availability.remaining = supply.remaining
      snapshot.availability.paid = supply.paid
      snapshot.availability.granted = supply.granted
      snapshot.availability.checkoutOpen = supply.open && supply.remaining > 0 && !snapshot.availability.reason
      if (!supply.open) snapshot.availability.reason = 'Initiation checkout is not open yet.'
      else if (supply.remaining <= 0) snapshot.availability.reason = 'All S26 seats are currently allocated or reserved.'
    }
    if (!user) return snapshot
    const results = await Promise.all([
      admin.from('voyager_profiles').select('role').eq('id', user.id).single(),
      admin.from('voyager_intake').select('version').eq('user_id', user.id).maybeSingle(),
      admin.rpc('eligible_legacy_initiation_order', { p_user: user.id }),
      admin.from('initiation_orders').select('id,status').eq('user_id', user.id).order('created_at', { ascending: false }),
      admin.from('initiation_entitlements').select('order_id,active,console_claimed_at,console_order_id').eq('user_id', user.id).maybeSingle(),
      admin.from('initiation_shipments').select('id,position,title,scheduled_month,status,tracking_url,legacy_order_id').eq('user_id', user.id).order('scheduled_month'),
      admin.from('initiation_members').select('source,active').eq('user_id', user.id).maybeSingle(),
    ])
    if (results.slice(0, 3).some(result => result.error)) throw new Error('Profile or historical orders could not be loaded.')
    const [profile, intake, legacy, orders, entitlement, shipments, member] = results.map(result => result.data)
    snapshot.role = profile.role
    snapshot.calibrated = intake?.version === VOYAGER_PROFILE_VERSION
    snapshot.legacyPackPurchased = !!legacy
    const kind = legacy ? 'legacy_upgrade' : 'standard'
    snapshot.offer = { kind, amount: legacy ? INITIATION_UPGRADE_AMOUNT : INITIATION_AMOUNT, currency: 'usd' }
    const offerConfig = initiationConfigurationError(kind)
    if (supply) {
      snapshot.availability.checkoutOpen = supply.open && supply.remaining > 0 && !offerConfig
      snapshot.availability.reason = !supply.open ? 'Initiation checkout is not open yet.' : supply.remaining <= 0 ? 'All S26 seats are currently allocated or reserved.' : offerConfig
    }
    const newRecordsUnavailable = results.slice(3).some(result => result.error)
    snapshot.status = newRecordsUnavailable ? 'unknown' : initiationMemberStatus(!!entitlement?.active, member, snapshot.legacyPackPurchased)
    snapshot.membershipSource = newRecordsUnavailable ? null : member?.source ?? null
    snapshot.paymentStatus = (newRecordsUnavailable ? 'unknown' : orders[0]?.status ?? 'none') as InitiationPaymentStatus
    snapshot.shipments = [
      ...(shipments ?? []).map((s: { id: string; position: number; title: string; scheduled_month: string; status: InitiationShipment['status']; tracking_url: string | null; legacy_order_id: string | null }) => ({ id: s.id, position: s.position, title: s.title, scheduledMonth: s.scheduled_month, status: s.status, trackingUrl: s.tracking_url, source: s.legacy_order_id ? 'legacy_pack' as const : 'initiation' as const })),

    ]
    snapshot.consoleClaim = { eligible: !!entitlement?.active, claimed: !!entitlement?.console_claimed_at, href: entitlement?.active ? (entitlement.console_claimed_at ? '/devices/my-consoles' : '/devices') : null }
    if (entitlement?.console_order_id) {
      const { data: claim, error: claimError } = await admin.from('voyager_orders').select('device_batch_slug').eq('id', entitlement.console_order_id).eq('user_id', user.id).eq('product_type', 'initiation_console_claim').maybeSingle()
      if (!claimError && claim?.device_batch_slug) {
        const { data: batch } = await admin.from('device_batches').select('slug,name').eq('slug', claim.device_batch_slug).maybeSingle()
        snapshot.consoleClaim.batch = { slug: claim.device_batch_slug, name: batch?.name ?? claim.device_batch_slug }
      }
    }
    if (newRecordsUnavailable) {
      snapshot.error = 'Initiation records are temporarily unavailable. Your historical Pack records are shown below.'
      snapshot.availability.checkoutOpen = false
      snapshot.availability.reason = snapshot.error
    }
    if (member?.active && member.source === 'granted') {
      snapshot.availability.checkoutOpen = false
      snapshot.availability.reason = 'Your granted S26 membership is already registered. It is not a payment or a Console claim entitlement.'
    }
    if (entitlement?.active) snapshot.availability.checkoutOpen = false
    return snapshot
  } catch {
    snapshot.status = 'unknown'
    snapshot.error = 'Your Initiation records are temporarily unavailable. Please try again.'
    snapshot.availability.checkoutOpen = false
    snapshot.availability.reason = snapshot.error
    return snapshot
  }
}

/** Device calls this with its selected batch slug; inventory is checked atomically. */
export async function claimInitiationConsole(batchSlug?: string): Promise<InitiationConsoleClaimResult> {
  try {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return { code: 'login_required', error: 'Please log in to claim your Console.' }
    // A caller-selected batch never bypasses the configured supply mapping.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (createAdminClient() as any).rpc('claim_initiation_console', { p_user: user.id, p_batch: batchSlug ?? null })
    const result = initiationClaimResult(data, error ? error.code ?? 'unknown' : null)
    if (!result.error) { revalidatePath('/voyager-initiation'); revalidatePath('/devices'); revalidatePath('/profile') }
    return result
  } catch {
    return { code: 'unavailable', error: 'Console allocation could not be confirmed. Please reload your records before trying again.' }
  }
}

export async function updateInitiationShipment(shipmentId: string, status: InitiationShipment['status'], trackingUrl: string | null) {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  // The SQL function repeats architect authorization and enforces transitions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (createAdminClient() as any).rpc('fulfill_initiation_shipment', { p_actor: user.id, p_shipment: shipmentId, p_status: status, p_tracking: trackingUrl })
  return { error: error ? 'The shipment could not be updated. Check permission, entitlement, current status and tracking URL.' : null }
}

export async function updateInitiationConsoleFulfillment(orderId: string, status: 'paid' | 'preparing' | 'shipped' | 'delivered', unitCode: string, trackingUrl: string | null) {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (createAdminClient() as any).rpc('fulfill_initiation_console', { p_actor: user.id, p_order: orderId, p_status: status, p_unit: unitCode, p_tracking: trackingUrl })
  return { error: error ? 'The Console could not be updated. Verify permission, active entitlement, exact Unit and tracking URL.' : null }
}
