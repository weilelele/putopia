import type { InitiationConsoleClaimResult } from './initiation-types'

/** Stable UI protocol for the atomic database claim; no role-based fallback. */
export function initiationClaimResult(data: { already?: boolean; orderId: string; unitCode?: string } | null, errorCode?: string | null): InitiationConsoleClaimResult {
  if (errorCode === 'P1001') return { code: 'ineligible', error: 'An active paid Initiation entitlement is required to claim a Console.' }
  if (errorCode === 'P1002') return { code: 'waiting_for_capacity', error: 'No Console units are available in this batch. Please wait for availability; your unclaimed entitlement is preserved.' }
  if (errorCode || !data) return { code: 'unavailable', error: 'Console allocation is not available for this batch. Your entitlement is preserved; please try again later.' }
  return { code: data.already ? 'already_claimed' : 'claimed', error: null, orderId: data.orderId, unitCode: data.unitCode }
}
