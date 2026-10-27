'use server'

import { getInitiationSnapshot } from '@/lib/actions/initiation'
import type { InitiationCheckoutResult } from './initiation-view'

/** Server preflight; the checkout API must repeat these checks when reserving a seat. */
export async function beginVoyagerInitiation(): Promise<InitiationCheckoutResult> {
  const state = await getInitiationSnapshot()
  if (state.status === 'unknown') return { status: 'not_open', message: state.error ?? 'Your membership records are unavailable. Please try again.' }
  if (!state.userId) return { status: 'unauthenticated', message: 'Please log in to continue.' }
  if (state.status === 'granted') return { status: 'not_open', accountStatus: state.status, message: 'Your granted S26 membership is already registered. No payment is required to register it again.' }
  if (state.status === 'initiated') return { status: 'not_open', accountStatus: state.status, message: 'Your Initiation is already confirmed. Refresh this page to view your deliveries and Console claim.' }
  if (!state.availability.checkoutOpen) return { status: 'not_open', accountStatus: state.status, message: state.availability.reason ?? 'Initiation checkout is not open yet.' }
  return { status: 'ready', accountStatus: state.status, message: 'Continue to secure checkout.' }
}
