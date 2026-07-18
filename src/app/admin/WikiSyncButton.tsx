'use client'

import { useState } from 'react'

type SyncState = 'idle' | 'syncing' | 'done' | 'error'

export default function WikiSyncButton() {
  const [state, setState] = useState<SyncState>('idle')
  const [info, setInfo]   = useState<string>('')

  async function handleSync() {
    setState('syncing')
    setInfo('')
    try {
      const res = await fetch('/api/wiki/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setState('error')
        setInfo(json.error ?? `HTTP ${res.status}`)
      } else {
        setState('done')
        setInfo(`${json.commit} · ${json.files} files`)
      }
    } catch (e) {
      setState('error')
      setInfo(e instanceof Error ? e.message : 'Network error')
    }
    // Auto-reset to idle after 8 s
    setTimeout(() => { setState('idle'); setInfo('') }, 8000)
  }

  const label   = state === 'syncing' ? 'SYNCING…' : state === 'done' ? '✓ SYNCED' : state === 'error' ? '✗ FAILED' : 'SYNC WIKI'
  const color   = state === 'done' ? '#FF6B35' : state === 'error' ? '#E83030' : '#E85D04'
  const opacity = state === 'syncing' ? 0.6 : 1

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <button
        onClick={handleSync}
        disabled={state === 'syncing'}
        style={{
          background:    'transparent',
          border:        `1px solid ${color}`,
          color,
          fontSize: 'var(--fs-caption)',
          letterSpacing: '0.2em',
          padding:       '5px 12px',
          cursor:        state === 'syncing' ? 'default' : 'pointer',
          opacity,
          fontFamily:    'monospace',
          transition:    'all 0.2s',
        }}
      >
        {label}
      </button>
      {info && (
        <span style={{ fontSize: 'var(--fs-caption)', color: state === 'error' ? '#E83030' : 'rgba(245,245,245,0.35)', letterSpacing: '0.05em' }}>
          {info}
        </span>
      )}
    </div>
  )
}
