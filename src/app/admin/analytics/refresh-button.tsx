'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RefreshButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRefresh = async () => {
    setLoading(true)
    try {
      await fetch('/api/analytics/snapshot')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      style={{
        fontFamily: 'monospace',
        fontSize: 10,
        letterSpacing: '0.2em',
        color: loading ? '#4A5570' : '#E85A00',
        background: 'transparent',
        border: '1px solid',
        borderColor: loading ? 'rgba(255,107,53,0.16)' : 'rgba(232,90,0,0.4)',
        padding: '6px 14px',
        cursor: loading ? 'default' : 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {loading ? '> CAPTURING...' : 'CAPTURE NOW'}
    </button>
  )
}
