'use client'

import { useEffect } from 'react'

/**
 * /preview — clears the voyager registration flag and immediately
 * redirects to the onboarding flow at /.
 * Share this link to re-experience the full onboarding sequence.
 */
export default function PreviewPage() {
  useEffect(() => {
    localStorage.removeItem('putopia_voyager_registered')
    window.location.replace('/')
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--color-deep-2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
        letterSpacing: '0.4em', color: 'rgba(232,93,4,0.5)',
      }}>
        RESETTING SIGNAL...
      </div>
    </div>
  )
}
