'use client'

import { useState } from 'react'
import { InitiationView } from '@/app/voyager-initiation/initiation-view'
import { parseVoyagerIntake } from '@/lib/voyager-intake'
import { fixture, type FixtureName } from './fixtures'
import type { VoyagerQuizServices } from '@/components/voyager-profile-quiz'
import { briefingRegions } from '@/lib/initiation-briefing'
import type { CheckoutSignInServices } from '@/app/voyager-initiation/checkout-sign-in'

// Fixture sign-in never calls Supabase: no email is sent and no account is created.
// Code 000000 succeeds; any other code shows the expired-code error.
const PREVIEW_SIGN_IN: CheckoutSignInServices = {
  sendCode: async () => ({ error: null }),
  verifyCode: async (_email, token) => ({ error: token === '000000' ? null : { code: 'otp_expired', status: 403 } }),
  signInWithPassword: async () => ({ error: null }),
}

// Local-only briefing data: names without avatars, and sample batch phases. Profiles open only if the IDs exist.
const PREVIEW_MEMBERS = ['Evan R.', 'marlowe_8', 'tinylag42', 'June K.', 'Nell', 'Arlo Bennett', 'westwindow', 'owen.tape', 'Celia', 'rivet_26']
  .map((displayName, i) => ({ id: `preview-member-${i}`, displayName, avatarUrl: null }))
const PREVIEW_REGIONS = briefingRegions([
  { location: 'Kyoto, Japan', status: 'claiming' }, { location: 'Shanghai, China', status: 'searching' }, { location: 'London, UK', status: 'searching' },
  { location: 'Oslo, Norway', status: 'searching' }, { location: 'Cairo, Egypt', status: 'searching' },
])

/** Development-only state. All calibration writes remain in this component. */
export function InitiationPreview({ name, deviceSource, paymentPlacement, briefingParam, calibrationIncomplete = false }: { name: FixtureName; deviceSource?: string; paymentPlacement?: 'top' | 'bottom'; briefingParam?: string; calibrationIncomplete?: boolean }) {
  const snapshot = { ...fixture(name), ...(calibrationIncomplete ? { calibrated: false } : {}) }
  const [completed, setCompleted] = useState(snapshot.calibrated)
  const services: VoyagerQuizServices = {
    load: async () => ({ userId: snapshot.userId, completed }),
    save: async raw => {
      if (!parseVoyagerIntake(raw)) return { ok: false, error: 'Please complete all five questions.' }
      setCompleted(true)
      return { ok: true }
    },
  }
  return <InitiationView snapshot={snapshot} members={PREVIEW_MEMBERS} regions={PREVIEW_REGIONS} briefingParam={briefingParam} paymentPlacement={paymentPlacement} deviceSource={deviceSource} quizServices={services} signInServices={PREVIEW_SIGN_IN} beginCheckout={async () => ({ status: 'not_open', message: 'Fixture only. No payment session has been created.' })} />
}
