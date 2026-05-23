'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EmailOtpType } from '@supabase/supabase-js'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const supabase = createClient()
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? '/'

    async function handle() {
      // PKCE flow (OAuth)
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) { router.replace(next); return }
      }

      // Email OTP flow (token_hash in query string)
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type })
        if (!error) { router.replace(next); return }
      }

      // Implicit flow — tokens in URL hash fragment (invite links)
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        if (!error) { router.replace(next); return }
      }

      router.replace('/?error=auth_failed')
    }

    handle()
  }, [router, searchParams])

  return (
    <div className="main" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-star-deep)', letterSpacing: '0.18em' }}>
        VERIFYING CREDENTIALS...
      </div>
    </div>
  )
}
