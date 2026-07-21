'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const supabase = createClient()
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const next = searchParams.get('next')

    // Where to send the now-authenticated user. Access links carry no ?next —
    // GoTrue ignores redirect_to URLs with query strings on admin-generated
    // links — so route by registration state instead.
    async function destination(): Promise<string> {
      if (next) return next
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return '/'
      const { data, error } = await supabase
        .from('voyager_profiles')
        .select('registered_at')
        .eq('id', user.id)
        .single()
      if (error) return '/'
      return data?.registered_at ? '/intel' : '/register'
    }

    async function handle() {
      // PKCE flow (OAuth)
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) { router.replace(await destination()); return }
      }

      // Email OTP flow (token_hash in query string)
      if (token_hash && type) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any })
        if (!error) { router.replace(await destination()); return }
      }

      // Implicit flow — tokens in URL hash fragment (invite links)
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        if (!error) { router.replace(await destination()); return }
      }

      router.replace('/auth/expired')
    }

    handle()
  }, [router, searchParams])

  return (
    <div className="main" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', letterSpacing: '0.18em' }}>
        VERIFYING CREDENTIALS...
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackInner />
    </Suspense>
  )
}
