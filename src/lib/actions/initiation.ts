'use server'
import { getRequestUser } from '@/lib/request-auth'
import { readInitiationSnapshot } from '@/lib/initiation-server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { initiationClaimResult } from '@/lib/initiation-claim'
import type { InitiationSnapshot, InitiationShipment, InitiationConsoleClaimResult } from '@/lib/initiation-types'

/** Identity comes only from the verified session, never action arguments. */
export async function getInitiationSnapshot(): Promise<InitiationSnapshot> {
  return readInitiationSnapshot(getRequestUser())
}

/** Device calls this with its selected batch slug; inventory is checked atomically. */
export async function claimInitiationConsole(batchSlug?: string): Promise<InitiationConsoleClaimResult> {
  try {
    const { data: { user } } = await getRequestUser()
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
  const { data: { user } } = await getRequestUser()
  if (!user) return { error: 'Not authenticated' }
  // The SQL function repeats architect authorization and enforces transitions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (createAdminClient() as any).rpc('fulfill_initiation_shipment', { p_actor: user.id, p_shipment: shipmentId, p_status: status, p_tracking: trackingUrl })
  return { error: error ? 'The shipment could not be updated. Check permission, entitlement, current status and tracking URL.' : null }
}

export async function updateInitiationConsoleFulfillment(orderId: string, status: 'paid' | 'preparing' | 'shipped' | 'delivered', unitCode: string, trackingUrl: string | null) {
  const { data: { user } } = await getRequestUser()
  if (!user) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (createAdminClient() as any).rpc('fulfill_initiation_console', { p_actor: user.id, p_order: orderId, p_status: status, p_unit: unitCode, p_tracking: trackingUrl })
  return { error: error ? 'The Console could not be updated. Verify permission, active entitlement, exact Unit and tracking URL.' : null }
}
