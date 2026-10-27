'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArchiveButton } from '@/components/archive-button'

/** Stripe can redirect before its webhook commits. Only re-read server records. */
export function PaymentStatusRefresh({ pending }: { pending: boolean }) {
  const router = useRouter()
  useEffect(() => {
    if (!pending) return
    let attempts = 0
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      router.refresh()
      if (++attempts >= 15) window.clearInterval(timer)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [pending, router])
  if (!pending) return null
  return <ArchiveButton variant="secondary" fullWidth onClick={() => router.refresh()}>REFRESH PAYMENT STATUS</ArchiveButton>
}
