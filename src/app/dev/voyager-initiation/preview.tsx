'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { MembershipPreview } from '@/app/voyager-initiation/membership-purchase'
import { InitiationView } from '@/app/voyager-initiation/initiation-view'
import { PrimaryNavigation } from '@/components/primary-navigation'
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
const PREVIEW_EMAIL_CHECKOUT = async (email: string, bundle: 'membership' | 'initial' | 'standard', options?: { upgrade?: boolean }): Promise<EmailCheckoutStep> => email.includes('digital') ? options?.upgrade ? { kind: 'error', message: 'Fixture only. Your upgrade would continue to Shopify here.' } : { kind: 'membership_upgrade', amount: bundle === 'initial' ? 2600 : 47600 }
  : email.includes('member') ? { kind: 'password' }
  : email.includes('limit') ? { kind: 'activation_sent' }
  : email.includes('paid') ? { kind: 'already_member' }
  : email.includes('initial') ? options?.upgrade ? { kind: 'error', message: 'Fixture only. The $460 upgrade would continue to Shopify here.' } : { kind: 'upgrade' }
  : { kind: 'error', message: 'Fixture only. A new email would get an activation link and continue straight to Shopify here.' }

// Preview-only briefing data: names without avatars, and sample batch phases. Profiles open only if the IDs exist.
const PREVIEW_MEMBERS = ['Evan R.', 'marlowe_8', 'tinylag42', 'June K.', 'Nell', 'Arlo Bennett', 'westwindow', 'owen.tape', 'Celia', 'rivet_26']
  .map((displayName, i) => ({ id: `preview-member-${i}`, displayName, avatarUrl: null }))
const PREVIEW_REGIONS = briefingRegions([
  { location: 'Kyoto, Japan', status: 'claiming' }, { location: 'Shanghai, China', status: 'searching' }, { location: 'London, UK', status: 'searching' },
  { location: 'Oslo, Norway', status: 'searching' }, { location: 'Cairo, Egypt', status: 'searching' },
])

/** Preview-only state. All calibration writes remain in this component. */
export function InitiationPreview({ name, deviceSource, paymentPlacement, briefingParam, calibrationIncomplete = false, largeText = false, membershipPreview, exerciseCheckout = false }: { exerciseCheckout?: boolean; name: FixtureName; deviceSource?: string; paymentPlacement?: 'top' | 'bottom'; briefingParam?: string; calibrationIncomplete?: boolean; largeText?: boolean; membershipPreview?: MembershipPreview }) {
  const snapshot = { ...fixture(exerciseCheckout && membershipPreview?.ownership === 'initial' ? 'initial_pack' : name), ...(calibrationIncomplete ? { calibrated: false } : {}) }
  if (exerciseCheckout) {
    snapshot.availability.checkoutOpen = true
    snapshot.availability.reason = null
    if (membershipPreview?.ownership === 'membership') {
      snapshot.status = 'membership'
      snapshot.role = 'voyager'
      snapshot.membershipActive = true
      snapshot.ownsSeat = true
      snapshot.paymentStatus = 'paid'
      snapshot.purchaseKind = 'membership'
    }
  }
  const [completed, setCompleted] = useState(snapshot.calibrated)
  const services: VoyagerQuizServices = {
    load: async () => ({ userId: snapshot.userId, completed, canShareObservation: snapshot.role === 'voyager' || snapshot.role === 'architect' }),
    save: async raw => {
      if (!parseVoyagerIntake(raw)) return { ok: false, error: 'Please complete all five questions.' }
      setCompleted(true)
      return { ok: true }
    },
  }
  const previewHref = (ownership: 'choose' | 'active' | 'initial') => `?membership=${ownership}${exerciseCheckout ? '&checkout=fixture' : ''}${paymentPlacement === 'top' ? '&layout=payment-first' : ''}`
  const ownership = membershipPreview?.ownership === 'membership' ? 'active' : membershipPreview?.ownership === 'initial' ? 'initial' : 'choose'
  return <>
    <aside className={styles.notice} aria-label="UI preview" data-initiation-large-text={largeText || undefined}>
      <p>Preview · No payment will be created</p>
      {membershipPreview ? (
        <nav aria-label="Preview purchase state">
          <Link href={previewHref('choose')} aria-current={ownership === 'choose' ? 'page' : undefined}>New buyer</Link>
          <Link href={previewHref('active')} aria-current={ownership === 'active' ? 'page' : undefined}>Digital member</Link>
          <Link href={previewHref('initial')} aria-current={ownership === 'initial' ? 'page' : undefined}>Initial owner</Link>
        </nav>
      ) : <nav aria-label="Preview purchase state">
        <Link href="?state=initial_pack&qa=1">Initial · $38</Link>
        <Link href="?state=upgraded&qa=1">Upgraded · $460</Link>
        <Link href="?state=complete_pack&qa=1">Complete · $488</Link>
        <Link href="?state=initial_pack&calibration=incomplete&qa=1">After payment · Calibration reminder</Link>
      </nav>}
    </aside>
    <InitiationView key={membershipPreview?.ownership}
      membershipEnabled={exerciseCheckout} initialBundle={membershipPreview?.ownership === 'membership' ? 'initial' : membershipPreview?.ownership === 'initial' ? 'standard' : 'membership'} membershipPreview={exerciseCheckout ? undefined : membershipPreview} snapshot={snapshot} members={PREVIEW_MEMBERS} regions={PREVIEW_REGIONS}
      briefingParam={briefingParam} paymentPlacement={paymentPlacement} deviceSource={deviceSource}
      quizServices={services} signInServices={PREVIEW_SIGN_IN} startEmailCheckout={PREVIEW_EMAIL_CHECKOUT}
      analyticsEnvironment="fixture"
      startCheckout={async input => ({ status: 'error', message: `Fixture checkout: ${input.bundle}. No payment session has been created.` })} />
    <PrimaryNavigation variant="bottom" activePath="/voyager-initiation" />
  </>
}
