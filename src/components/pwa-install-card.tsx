'use client'

import { useState } from 'react'
import { usePwaInstall } from '@/components/pwa-provider'

export function PwaInstallCard() {
  const { canInstall, promptInstall } = usePwaInstall()
  const [installing, setInstalling] = useState(false)

  if (!canInstall) return null

  const handleInstall = async () => {
    setInstalling(true)
    try {
      await promptInstall()
    } finally {
      setInstalling(false)
    }
  }

  return (
    <aside
      aria-label="Install Multiverse on Android"
      style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: 820,
        margin: '0 auto 1.25rem',
        padding: '0.85rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        border: '1px solid var(--bd-cyan-2)',
        background: 'var(--bg-panel)',
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-caption)',
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: 'var(--color-nucleus)',
        }}>
          ANDROID UPLINK AVAILABLE
        </div>
        <div style={{
          marginTop: '0.2rem',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-caption)',
          lineHeight: 1.5,
          color: 'var(--color-star-dim)',
        }}>
          Add the Console to your home screen for standalone access.
        </div>
      </div>
      <button
        type="button"
        className="btn-primary"
        disabled={installing}
        onClick={handleInstall}
        style={{
          minWidth: 118,
          minHeight: 44,
          padding: '0.7rem 1rem',
          justifyContent: 'center',
          opacity: installing ? 0.6 : 1,
          flexShrink: 0,
        }}
      >
        {installing ? 'OPENING…' : 'INSTALL'}
      </button>
    </aside>
  )
}
