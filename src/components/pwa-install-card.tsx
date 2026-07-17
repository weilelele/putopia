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
        minHeight: 80,
        margin: '0 auto 1rem',
        padding: '0.7rem 1rem',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gridTemplateRows: 'auto auto',
        columnGap: '0.75rem',
        rowGap: '0.25rem',
        alignItems: 'center',
        border: '1px solid var(--bd-cyan-2)',
        background: 'var(--bg-panel)',
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
      }}
    >
      <div style={{
        gridColumn: '1 / -1',
        minWidth: 0,
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--fs-caption)',
        fontWeight: 700,
        letterSpacing: '0.14em',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        color: 'var(--color-nucleus)',
      }}>
        ANDROID UPLINK AVAILABLE
      </div>
      <div style={{
        minWidth: 0,
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--fs-caption)',
        lineHeight: 1.25,
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        color: 'var(--color-star-dim)',
      }}>
        Add Console to your home screen.
      </div>
      <button
        type="button"
        className="btn-primary"
        disabled={installing}
        onClick={handleInstall}
        style={{
          minWidth: 118,
          minHeight: 44,
          padding: '0.65rem 1rem',
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
