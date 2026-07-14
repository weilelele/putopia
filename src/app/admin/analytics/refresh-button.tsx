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
        fontSize: 'var(--fs-caption)',
        letterSpacing: '0.2em',
        color: loading ? 'rgba(245,245,245,0.35)' : '#C84406',
        background: 'transparent',
        border: '1px solid',
        borderColor: loading ? 'rgba(227,82,5,0.16)' : 'rgba(200,68,6,0.4)',
        padding: '6px 14px',
        cursor: loading ? 'default' : 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {loading ? '> CAPTURING...' : 'CAPTURE NOW'}
    </button>
  )
}
