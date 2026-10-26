'use client'

import { useState } from 'react'
import Link from 'next/link'
import { InitiationView } from '@/app/voyager-initiation/initiation-view'
import { parseVoyagerIntake } from '@/lib/voyager-intake'
import { fixture, type FixtureName } from './fixtures'
import type { VoyagerQuizServices } from '@/components/voyager-profile-quiz'
import { briefingRegions } from '@/lib/initiation-briefing'
import styles from './preview.module.css'

// Preview-only briefing data: names without avatars, and sample batch phases. Profiles open only if the IDs exist.
const PREVIEW_MEMBERS = ['Evan R.', 'marlowe_8', 'tinylag42', 'June K.', 'Nell', 'Arlo Bennett', 'westwindow', 'owen.tape', 'Celia', 'rivet_26']
  .map((displayName, i) => ({ id: `preview-member-${i}`, displayName, avatarUrl: null }))
const PREVIEW_REGIONS = briefingRegions([
  { location: 'Kyoto, Japan', status: 'claiming' }, { location: 'Shanghai, China', status: 'searching' }, { location: 'London, UK', status: 'searching' },
  { location: 'Oslo, Norway', status: 'searching' }, { location: 'Cairo, Egypt', status: 'searching' },
])

/** Preview-only state. All calibration writes remain in this component. */
export function InitiationPreview({ name, deviceSource, paymentPlacement, briefingParam, calibrationIncomplete = false }: { name: FixtureName; deviceSource?: string; paymentPlacement?: 'top' | 'bottom'; briefingParam?: string; calibrationIncomplete?: boolean }) {
  const snapshot = fixture(name)
  if (calibrationIncomplete) snapshot.calibrated = false
  const [completed, setCompleted] = useState(snapshot.calibrated)
  const services: VoyagerQuizServices = {
    load: async () => ({ userId: snapshot.userId, completed }),
    save: async raw => {
      if (!parseVoyagerIntake(raw)) return { ok: false, error: 'Please complete all five questions.' }
      setCompleted(true)
      return { ok: true }
    },
  }
  return <><aside className={styles.notice} aria-label="UI preview"><p>Simulated records · No payment will be created</p><nav aria-label="Preview purchase state"><Link href="?state=initial_pack&qa=1">Initial · $38</Link><Link href="?state=upgraded&qa=1">Upgraded · $460</Link><Link href="?state=complete_pack&qa=1">Complete · $488</Link><Link href="?state=initial_pack&calibration=incomplete&qa=1">After payment · Calibration reminder</Link></nav></aside><InitiationView snapshot={snapshot} members={PREVIEW_MEMBERS} regions={PREVIEW_REGIONS} briefingParam={briefingParam} paymentPlacement={paymentPlacement} deviceSource={deviceSource} quizServices={services} startGuestSession={async () => ({ error: null })} analyticsEnvironment="fixture" beginCheckout={async () => ({ status: 'not_open', message: 'Fixture only. No payment session has been created.' })} /></>
}
