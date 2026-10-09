'use client'

import { useState } from 'react'
import { InitiationView } from '@/app/voyager-initiation/initiation-view'
import { parseVoyagerIntake } from '@/lib/voyager-intake'
import { fixture, type FixtureName } from './fixtures'
import type { VoyagerQuizServices } from '@/components/voyager-profile-quiz'

/** Development-only state. All calibration writes remain in this component. */
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
  return <InitiationView snapshot={snapshot} paymentPlacement={paymentPlacement} deviceSource={deviceSource} quizServices={services} beginCheckout={async () => ({ status: completed ? 'not_open' : 'calibration_required', message: 'Fixture only. No payment session has been created.' })} />
}
