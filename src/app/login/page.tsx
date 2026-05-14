'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import clsx from 'clsx'

type Tab = 'login' | 'register'

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('ERR: FIELDS INCOMPLETE')
      return
    }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    login(email, name || undefined)
    setLoading(false)
    router.push('/intel')
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4 starfield" style={{ background: '#070912' }}>
      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#1E2840 1px, transparent 1px), linear-gradient(90deg, #1E2840 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="text-xs tracking-[0.3em] font-mono mb-2" style={{ color: '#4A5570' }}>
            PUTOPIA COLLECTIVE
          </div>
          <div className="text-lg font-mono tracking-widest glow-orange-text" style={{ color: '#E85A00' }}>
            IDENTITY VERIFICATION
          </div>
          <div className="text-xs font-mono mt-1" style={{ color: '#1E2840' }}>
            // SECURE CONNECTION ESTABLISHED
          </div>
        </div>

        {/* Card */}
        <div
          className="border p-6"
          style={{
            background: '#111525',
            borderColor: '#1E2840',
            boxShadow: 'inset 0 1px 0 rgba(232,90,0,0.06)',
          }}
        >
          {/* Tabs */}
          <div className="flex mb-6 border-b" style={{ borderColor: '#1A2238' }}>
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className={clsx(
                  'flex-1 py-2 text-xs font-mono tracking-widest transition-colors',
                  tab === t ? 'border-b-2' : 'hover:opacity-70'
                )}
                style={
                  tab === t
                    ? { color: '#E85A00', borderColor: '#E85A00', marginBottom: '-1px' }
                    : { color: '#4A5570' }
                }
              >
                {t === 'login' ? '[ LOGIN ]' : '[ REGISTER ]'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#4A5570' }}>
                  DISPLAY NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ALIAS_IDENTIFIER"
                  className="input-dark"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#4A5570' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operative@domain.void"
                className="input-dark"
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
                placeholder="••••••••••••"
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
              className="btn-orange w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ justifyContent: 'center', fontSize: '0.8rem' }}
            >
              {loading ? '> AUTHENTICATING...' : tab === 'login' ? '[ AUTHENTICATE ]' : '[ CREATE IDENTITY ]'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs font-mono" style={{ color: '#4A5570' }}>
            {tab === 'login'
              ? 'TIP: include "architect" in email for architect role'
              : 'New identity will default to VOYAGER role'}
          </div>
        </div>

        <div className="mt-4 text-center text-xs font-mono" style={{ color: '#1A2238' }}>
          // ALL ACCESS ATTEMPTS ARE LOGGED //
        </div>
      </div>
    </div>
  )
}
