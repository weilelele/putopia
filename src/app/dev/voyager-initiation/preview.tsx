'use client'

import { useState } from 'react'
import Link from 'next/link'
import { InitiationView } from '@/app/voyager-initiation/initiation-view'
import { parseVoyagerIntake } from '@/lib/voyager-intake'
import { fixture, type FixtureName } from './fixtures'
import type { VoyagerQuizServices } from '@/components/voyager-profile-quiz'
import { briefingRegions } from '@/lib/initiation-briefing'
import styles from './preview.module.css'
import type { CheckoutSignInServices, EmailCheckoutStep } from '@/app/voyager-initiation/checkout-sign-in'

// Fixture sign-in never calls Supabase: no email is sent and no account is created.
// Password "voyager" succeeds; any other password shows the incorrect-password error.
const PREVIEW_SIGN_IN: CheckoutSignInServices = {
  signInWithPassword: async (_email, password) => ({ error: password === 'voyager' ? null : { code: 'invalid_credentials', status: 400 } }),
}
// Fixture email checkout: an address containing "member" acts as an activated account (password step),
// "limit" as over the per-IP limit (activation link only), "paid" as an unactivated member (nothing to pay),
// "initial" as an unactivated Initial Pack owner ($460 upgrade); any other address stops before Stripe.
const PREVIEW_EMAIL_CHECKOUT = async (email: string, _bundle: 'initial' | 'standard', options?: { upgrade?: boolean }): Promise<EmailCheckoutStep> => email.includes('member') ? { kind: 'password' }
  : email.includes('limit') ? { kind: 'activation_sent' }
  : email.includes('paid') ? { kind: 'already_member' }
  : email.includes('initial') ? options?.upgrade ? { kind: 'error', message: 'Fixture only. The $460 upgrade would continue to Stripe here.' } : { kind: 'upgrade' }
  : { kind: 'error', message: 'Fixture only. A new email would get an activation link and continue straight to Stripe here.' }

// Preview-only briefing data: names without avatars, and sample batch phases. Profiles open only if the IDs exist.
const PREVIEW_MEMBERS = ['Evan R.', 'marlowe_8', 'tinylag42', 'June K.', 'Nell', 'Arlo Bennett', 'westwindow', 'owen.tape', 'Celia', 'rivet_26']
  .map((displayName, i) => ({ id: `preview-member-${i}`, displayName, avatarUrl: null }))
const PREVIEW_REGIONS = briefingRegions([
  { location: 'Kyoto, Japan', status: 'claiming' }, { location: 'Shanghai, China', status: 'searching' }, { location: 'London, UK', status: 'searching' },
  { location: 'Oslo, Norway', status: 'searching' }, { location: 'Cairo, Egypt', status: 'searching' },
])

/** Preview-only state. All calibration writes remain in this component. */
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
  return <><aside className={styles.notice} aria-label="UI preview"><p>Simulated records · No payment will be created</p><nav aria-label="Preview purchase state"><Link href="?state=initial_pack&qa=1">Initial · $38</Link><Link href="?state=upgraded&qa=1">Upgraded · $460</Link><Link href="?state=complete_pack&qa=1">Complete · $488</Link><Link href="?state=initial_pack&calibration=incomplete&qa=1">After payment · Calibration reminder</Link></nav></aside><InitiationView snapshot={snapshot} members={PREVIEW_MEMBERS} regions={PREVIEW_REGIONS} briefingParam={briefingParam} paymentPlacement={paymentPlacement} deviceSource={deviceSource} quizServices={services} signInServices={PREVIEW_SIGN_IN} startEmailCheckout={PREVIEW_EMAIL_CHECKOUT} analyticsEnvironment="fixture" beginCheckout={async () => ({ status: 'not_open', message: 'Fixture only. No payment session has been created.' })} /></>
}
