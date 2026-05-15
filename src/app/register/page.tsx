'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  // Guard: must have an active session (from invite link via /auth/callback)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/')
      } else {
        setChecking(false)
      }
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!displayName.trim()) {
      setError('ERR: DISPLAY NAME REQUIRED')
      return
    }
    if (password.length < 8) {
      setError('ERR: ACCESS CODE MUST BE AT LEAST 8 CHARACTERS')
      return
    }
    if (password !== confirmPassword) {
      setError('ERR: ACCESS CODES DO NOT MATCH')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Set password on the invite-created account
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { display_name: displayName.trim() },
    })

    if (updateError) {
      setError(`ERR: ${updateError.message.toUpperCase()}`)
      setLoading(false)
      return
    }

    // Create voyager profile
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('voyager_profiles') as any).upsert({
        id: user.id,
        display_name: displayName.trim(),
        bio: null,
        avatar_url: null,
        social_x: null,
        social_instagram: null,
        social_linkedin: null,
        location: null,
        role: 'applicant',
        observation_days: 0,
        worlds_discovered: 0,
      }, { onConflict: 'id' })
    }

    router.push('/intel')
    router.refresh()
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#070912' }}>
        <div className="text-xs font-mono" style={{ color: '#4A5570' }}>VERIFYING CREDENTIALS...</div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4" style={{ background: '#070912' }}>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#1E2840 1px, transparent 1px), linear-gradient(90deg, #1E2840 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <div className="text-xs tracking-[0.3em] font-mono mb-2" style={{ color: '#4A5570' }}>
            PUTOPIA COLLECTIVE
          </div>
          <div className="text-lg font-mono tracking-widest" style={{ color: '#22D4E0', textShadow: '0 0 20px rgba(34,212,224,0.4)' }}>
            IDENTITY REGISTRATION
          </div>
          <div className="text-xs font-mono mt-1" style={{ color: '#4A5570' }}>
            // INVITATION VERIFIED — ESTABLISH YOUR IDENTITY
          </div>
        </div>

        <div className="border p-6" style={{ background: '#111525', borderColor: '#1A2E30', boxShadow: 'inset 0 1px 0 rgba(34,212,224,0.06)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#4A5570' }}>
                DISPLAY NAME
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ALIAS_IDENTIFIER"
                className="input-dark"
                maxLength={40}
              />
            </div>

            <div>
              <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#4A5570' }}>
                ACCESS CODE
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min. 8 characters"
                className="input-dark"
              />
            </div>

            <div>
              <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#4A5570' }}>
                CONFIRM ACCESS CODE
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="repeat code"
                className="input-dark"
              />
            </div>

            {error && (
              <div
                className="text-xs font-mono py-2 px-3 border"
                style={{ color: '#E83030', borderColor: 'rgba(232,48,48,0.3)', background: 'rgba(232,48,48,0.08)' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-xs font-mono tracking-widest font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{
                background: 'linear-gradient(180deg, rgba(34,212,224,0.25), rgba(34,212,224,0.10))',
                border: '1px solid rgba(34,212,224,0.4)',
                color: '#B8F4F6',
              }}
            >
              {loading ? '> REGISTERING...' : '[ ESTABLISH IDENTITY ]'}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center text-xs font-mono" style={{ color: '#1A2238' }}>
          // YOUR IDENTITY WILL BE RECORDED IN THE COLLECTIVE //
        </div>
      </div>
    </div>
  )
}
