'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { HudField } from '@/components/hud-field'
import { resendAccessLink } from '@/lib/actions/auth-resend'

function ExpiredInner() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function handleResend(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrMsg('')
    const res = await resendAccessLink(email)
    if (res.ok) {
      setStatus('sent')
    } else {
      setStatus('error')
      setErrMsg(res.error ?? 'SOMETHING WENT WRONG.')
    }
  }

  return (
    <div className="main" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="top-bar" style={{ position: 'absolute', top: 0, left: '2.5rem', right: '2.5rem' }}>
        <div className="crumbs">PC://CONSOLE <span>/</span> AUTHENTICATION</div>
      </div>

      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="h-eyebrow" style={{ marginBottom: '0.5rem' }}>// LINK EXPIRED</div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--fs-h3)',
            fontWeight: 900,
            color: 'var(--color-nucleus)',
            letterSpacing: '0.05em',
            textShadow: '0 0 20px rgba(255,90,31,0.5)',
          }}>
            ACCESS EXPIRED
          </div>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--fs-caption)',
            color: 'var(--color-star-deep)',
            marginTop: '0.75rem',
            lineHeight: 1.7,
          }}>
            YOUR ACCESS LINK IS NO LONGER VALID.<br />
            ENTER YOUR EMAIL TO RECEIVE A NEW ONE.
          </p>
        </div>

        {status === 'sent' ? (
          <div
            className="hud-frame"
            style={{ padding: '2rem 1.5rem', textAlign: 'center' }}
          >
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-label)',
              color: 'var(--color-nucleus)',
              letterSpacing: '0.15em',
              marginBottom: '0.75rem',
            }}>
              ✦ LINK TRANSMITTED
            </div>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-caption)',
              color: 'var(--color-star-deep)',
              lineHeight: 1.7,
            }}>
              CHECK YOUR INBOX AT<br />
              <span style={{ color: 'var(--color-star)' }}>{email}</span>
            </p>
          </div>
        ) : (
          <div className="hud-frame">
            <div className="hud-tick-rail hud-tick-left" />
            <div className="hud-tick-rail hud-tick-right" />
            <div style={{ padding: '0 1rem' }}>
              <form onSubmit={handleResend} className="space-y-4">
                <div>
                  <label
                    className="block text-xs font-mono tracking-widest mb-1.5"
                    style={{ color: 'rgba(245,245,245,0.35)' }}
                  >
                    EMAIL ADDRESS
                  </label>
                  <HudField>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operative@domain.void"
                      className="input-dark"
                      required
                    />
                  </HudField>
                </div>

                {status === 'error' && (
                  <div
                    className="text-xs font-mono py-2 px-3 border"
                    style={{
                      color: '#E83030',
                      borderColor: 'rgba(232,48,48,0.3)',
                      background: 'rgba(232,48,48,0.08)',
                    }}
                  >
                    {errMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="btn-orange w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ justifyContent: 'center', fontSize: 'var(--fs-label)' }}
                >
                  {status === 'loading' ? '> TRANSMITTING...' : '[ RESEND ACCESS LINK ]'}
                </button>
              </form>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'center', padding: '1rem', border: '1px solid var(--bd-faint)' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--fs-caption)',
            letterSpacing: '0.2em',
            color: 'var(--color-star-deep)',
            marginBottom: '0.5rem',
          }}>
            ALREADY HAVE CREDENTIALS?
          </div>
          <Link
            href="/login"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-caption)',
              letterSpacing: '0.15em',
              color: 'var(--color-nucleus)',
            }}
          >
            LOG IN →
          </Link>
        </div>

        <div style={{
          marginTop: '1rem',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-caption)',
          letterSpacing: '0.2em',
          color: 'var(--color-star-deep)',
          opacity: 0.5,
        }}>
          // ALL ACCESS ATTEMPTS ARE LOGGED //
        </div>
      </div>

      <div className="footer-bar" style={{ position: 'absolute', bottom: '2rem', left: '2.5rem', right: '2.5rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>PUTOPIA.COLLECTIVE</div>
      </div>
    </div>
  )
}

export default function AuthExpiredPage() {
  return (
    <Suspense>
      <ExpiredInner />
    </Suspense>
  )
}
