'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthConfirmPage() {
  return (
    <Suspense>
      <AuthConfirmInner />
    </Suspense>
  )
}

function AuthConfirmInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') as 'invite' | 'magiclink' | 'email' | 'recovery' | null
    const next = searchParams.get('next') ?? '/'

    if (!tokenHash || !type) {
      router.replace('/?error=auth_failed')
      return
    }

    const supabase = createClient()
    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
      if (error) {
        router.replace(`/?error=auth_failed&error_code=${(error as { code?: string }).code ?? 'unknown'}`)
      } else {
        router.replace(next)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-deep)',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
        color: 'var(--color-star-deep)', letterSpacing: '0.18em',
      }}>
        VERIFYING CREDENTIALS...
      </div>
    </div>
  )
}
