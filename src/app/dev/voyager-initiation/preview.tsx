'use client'

import { useState } from 'react'
import Link from 'next/link'
import { InitiationView } from '@/app/voyager-initiation/initiation-view'
import { parseVoyagerIntake } from '@/lib/voyager-intake'
import { fixture, type FixtureName } from './fixtures'
import type { VoyagerQuizServices } from '@/components/voyager-profile-quiz'
import styles from './preview.module.css'

/** Preview-only state. All calibration writes remain in this component. */
export function InitiationPreview({ name, deviceSource, paymentPlacement }: { name: FixtureName; deviceSource?: string; paymentPlacement?: 'top' | 'bottom' }) {
  const snapshot = fixture(name)
  const [completed, setCompleted] = useState(snapshot.calibrated)
  const services: VoyagerQuizServices = {
    load: async () => ({ userId: snapshot.userId, completed }),
    save: async raw => {
      if (!parseVoyagerIntake(raw)) return { ok: false, error: 'Please complete all five questions.' }
      setCompleted(true)
      return { ok: true }
    },
  }
  return <><aside className={styles.notice} aria-label="UI preview"><p>Simulated records · No payment will be created</p><nav aria-label="Preview purchase state"><Link href="?state=initial_pack&qa=1">Initial · $38</Link><Link href="?state=upgraded&qa=1">Upgraded · $460</Link><Link href="?state=complete_pack&qa=1">Complete · $488</Link></nav></aside><InitiationView snapshot={snapshot} paymentPlacement={paymentPlacement} deviceSource={deviceSource} quizServices={services} analyticsEnvironment="fixture" beginCheckout={async () => ({ status: completed ? 'not_open' : 'calibration_required', message: 'Fixture only. No payment session has been created.' })} /></>
}
