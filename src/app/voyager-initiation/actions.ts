'use server'

import { getInitiationSnapshot } from '@/lib/actions/initiation'
import type { InitiationCheckoutResult } from './initiation-view'
import { initiationPaymentHold } from '@/lib/initiation-payment-hold'

/** Server preflight; the checkout API must repeat these checks when reserving a seat. */
export async function beginVoyagerInitiation(): Promise<InitiationCheckoutResult> {
  const state = await getInitiationSnapshot()
  if (state.status === 'unknown') return { status: 'not_open', message: state.error ?? 'Your membership records are unavailable. Please try again.' }
  if (!state.userId) return { status: 'unauthenticated', message: 'Please log in to continue.' }
  if (state.status === 'granted') return { status: 'not_open', message: 'Your granted S26 membership is already registered. No payment is required to register it again.' }
  if (state.status === 'initiated') return { status: 'not_open', message: 'Your Initiation is already confirmed. Refresh this page to view your deliveries and Console claim.' }
  const hold = initiationPaymentHold(state)
  if (hold) return { status: 'not_open', message: hold.message }
  if (!state.availability.checkoutOpen) return { status: 'not_open', message: state.availability.reason ?? 'Initiation checkout is not open yet.' }
  return { status: 'ready', message: 'Continue to secure checkout.' }
}
