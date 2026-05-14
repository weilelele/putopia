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
    <div className="flex items-center justify-center min-h-screen px-4" style={{ background: '#0F0A00' }}>
      {/* Warm grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(#5C4A1E 1px, transparent 1px), linear-gradient(90deg, #5C4A1E 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="text-xs tracking-[0.3em] font-mono mb-2" style={{ color: '#7A6A40' }}>
            PUTOPIA COLLECTIVE
          </div>
          <div className="text-lg font-mono tracking-widest" style={{ color: '#E8A020', textShadow: '0 0 16px rgba(232,160,32,0.3)' }}>
            IDENTITY VERIFICATION
          </div>
          <div className="text-xs font-mono mt-1" style={{ color: '#3D3010' }}>
            // SECURE CONNECTION ESTABLISHED
          </div>
        </div>

        {/* Card */}
        <div
          className="border rounded p-6"
          style={{
            background: '#221800',
            borderColor: '#5C4A1E',
            boxShadow: 'inset 0 1px 0 rgba(232,160,32,0.1)',
          }}
        >
          {/* Tabs */}
          <div className="flex mb-6 border-b" style={{ borderColor: '#3D3010' }}>
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
                    ? { color: '#E8A020', borderColor: '#E8A020', marginBottom: '-1px' }
                    : { color: '#7A6A40' }
                }
              >
                {t === 'login' ? '[ LOGIN ]' : '[ REGISTER ]'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#7A6A40' }}>
                  DISPLAY NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ALIAS_IDENTIFIER"
                  className="w-full px-3 py-2 text-sm font-mono rounded border bg-transparent outline-none transition-colors"
                  style={{ borderColor: '#3D3010', color: '#F5E6C8' }}
                  onFocus={(e) => (e.target.style.borderColor = '#E8A020')}
                  onBlur={(e) => (e.target.style.borderColor = '#3D3010')}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#7A6A40' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operative@domain.void"
                className="w-full px-3 py-2 text-sm font-mono rounded border bg-transparent outline-none transition-colors"
                style={{ borderColor: '#3D3010', color: '#F5E6C8' }}
                onFocus={(e) => (e.target.style.borderColor = '#E8A020')}
                onBlur={(e) => (e.target.style.borderColor = '#3D3010')}
              />
            </div>

            <div>
              <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#7A6A40' }}>
                ACCESS CODE
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 text-sm font-mono rounded border bg-transparent outline-none transition-colors"
                style={{ borderColor: '#3D3010', color: '#F5E6C8' }}
                onFocus={(e) => (e.target.style.borderColor = '#E8A020')}
                onBlur={(e) => (e.target.style.borderColor = '#3D3010')}
              />
            </div>

            {error && (
              <div
                className="text-xs font-mono py-2 px-3 rounded border"
                style={{ color: '#C43020', borderColor: 'rgba(196,48,32,0.33)', background: 'rgba(196,48,32,0.11)' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-mono tracking-widest border transition-all duration-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: '#E8A020', color: '#0F0A00', background: '#E8A020' }}
            >
              {loading ? '> AUTHENTICATING...' : tab === 'login' ? '[ AUTHENTICATE ]' : '[ CREATE IDENTITY ]'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs font-mono" style={{ color: '#5C4A1E' }}>
            {tab === 'login'
              ? 'TIP: include "architect" in email for architect role'
              : 'New identity will default to VOYAGER role'}
          </div>
        </div>

        <div className="mt-4 text-center text-xs font-mono" style={{ color: '#3D3010' }}>
          // ALL ACCESS ATTEMPTS ARE LOGGED //
        </div>
      </div>
    </div>
  )
}
