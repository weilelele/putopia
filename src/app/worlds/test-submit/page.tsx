'use client'

// HIDDEN test console (no nav entry). Files is_test worlds with a short scan
// window so the full submit → scan → ready/failed flow can be exercised against
// the live DB without polluting the real World Records. Hidden on production;
// visible on branch previews + local dev. Throwaway — delete before merge.

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { submitTestWorld, listTestWorlds, deleteWorld } from '@/lib/actions/worlds'
import { scanSecondsLeft, scanComplete } from '@/lib/signal/scan'
import { ScanInitiation } from '@/components/scan-initiation'

type TestWorld = { id: string; name: string; scan_until: string | null; lifecycle_state: string; submitted_at: string | null }

const label = { fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color: 'rgba(245,245,245,0.45)', display: 'block', marginBottom: '0.5rem' } as const
const field = { width: '100%', padding: '0.7rem 0.9rem', background: 'var(--bg-panel)', border: '1px solid var(--bd-cyan-2)', color: 'var(--tx-primary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', outline: 'none', boxSizing: 'border-box' as const }

export default function TestSubmitPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [name, setName] = useState('Test World')
  const [description, setDescription] = useState('End-to-end scan flow test. This is throwaway test data and is excluded from the public World Records.')
  const [scanMinutes, setScanMinutes] = useState(2)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [launched, setLaunched] = useState<{ id: string; name: string } | null>(null)
  const [tests, setTests] = useState<TestWorld[]>([])

  const refresh = useCallback(() => { listTestWorlds().then((d) => setTests(d as TestWorld[])).catch(() => {}) }, [])
  useEffect(() => { refresh() }, [refresh])

  const isGuest = user.role === 'guest'
  const canSubmit = name.trim().length > 0 && description.trim().length >= 20 && !loading && !isGuest

  if (process.env.VERCEL_ENV === 'production') return null

  async function submit() {
    if (!canSubmit) return
    setLoading(true); setError(null)
    const res = await submitTestWorld({ name: name.trim(), description: description.trim(), scanMinutes })
    if (res.error || !res.data) { setError(res.error ?? 'Failed'); setLoading(false); return }
    refresh()
    setLaunched({ id: res.data.id, name: name.trim() })
  }

  async function remove(id: string) {
    await deleteWorld(id)
    refresh()
  }

  return (
    <div style={{ height: '100vh', overflowY: 'auto' }}>
      {launched && <ScanInitiation worldName={launched.name} onComplete={() => router.push(`/worlds/${encodeURIComponent(launched.id)}`)} />}

      <div className="main">
        <div className="top-bar"><div className="crumbs">DEV / TEST SUBMIT (hidden)</div></div>

        <div style={{ maxWidth: 640, width: '100%' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--color-star)', margin: '1rem 0 0.5rem' }}>
            TEST <span style={{ color: 'var(--color-nucleus)' }}>SCAN FLOW</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            Files an <b>is_test</b> world with a short scan window. Excluded from World Records; no activity-feed event. Use it to walk submit → scan → ready/failed end-to-end.
          </p>

          {isGuest && (
            <div style={{ padding: '0.85rem', border: '1px solid rgba(255,107,53,0.3)', background: 'rgba(255,107,53,0.06)', marginBottom: '1.25rem', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.7)' }}>
              <span style={{ color: 'var(--color-nucleus)', letterSpacing: '0.12em' }}>LOGIN REQUIRED</span> — <Link href="/login" style={{ color: 'var(--color-nucleus)' }}>log in</Link> to file test worlds.
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={label}>WORLD DESIGNATION</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={isGuest || loading} maxLength={80} style={field} />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={label}>FIELD NOTES <span style={{ color: 'rgba(245,245,245,0.25)' }}>min 20</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={isGuest || loading} rows={4} style={{ ...field, lineHeight: 1.7, resize: 'vertical', minHeight: 100 }} />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={label}>SCAN WINDOW (MINUTES)</label>
            <input type="number" min={0} max={600} step={1} value={scanMinutes} onChange={(e) => setScanMinutes(Math.max(0, Math.round(Number(e.target.value) || 0)))} disabled={isGuest || loading} style={{ ...field, width: 120 }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', marginTop: 6 }}>
              0 = scan completes immediately (lands on FAILED unless a thread exists). 2 = watch a short countdown.
            </div>
          </div>

          {error && (
            <div style={{ padding: '0.7rem 0.9rem', border: '1px solid rgba(255,80,80,0.3)', background: 'rgba(255,80,80,0.06)', marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(255,120,120,0.9)' }}>
              ERROR: {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{ width: '100%', padding: '0.9rem', background: canSubmit ? 'linear-gradient(135deg, #E85D04, #C04000)' : 'rgba(255,107,53,0.08)', border: '1px solid rgba(232,93,4,0.5)', color: canSubmit ? '#F5F5F5' : 'rgba(245,245,245,0.3)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', fontWeight: 700, letterSpacing: '0.18em', cursor: canSubmit ? 'pointer' : 'not-allowed' }}
          >
            {loading ? 'FILING…' : 'FILE TEST SIGHTING →'}
          </button>

          {/* Existing test worlds */}
          <div style={{ marginTop: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'var(--color-star-dim)' }}>{'// TEST WORLDS'}</span>
              <button onClick={refresh} style={{ background: 'none', border: '1px solid var(--bd-faint)', color: 'var(--color-star-dim)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', padding: '3px 10px', cursor: 'pointer' }}>↻ REFRESH</button>
            </div>
            {tests.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)' }}>None yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tests.map((w) => {
                  const left = scanSecondsLeft(w.scan_until)
                  const state = w.lifecycle_state !== 'proposed' ? w.lifecycle_state.toUpperCase()
                    : scanComplete(w.scan_until) ? 'SCAN DONE' : `SCANNING ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
                  return (
                    <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.55rem 0.7rem', border: '1px solid var(--bd-faint)', background: 'var(--bg-card)' }}>
                      <Link href={`/worlds/${encodeURIComponent(w.id)}`} style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-nebula)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {w.name} <span style={{ color: 'var(--color-star-deep)' }}>· {w.id}</span>
                      </Link>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-warn)', flexShrink: 0 }}>{state}</span>
                      <button onClick={() => remove(w.id)} style={{ background: 'none', border: '1px solid rgba(232,48,48,0.4)', color: 'var(--color-fault)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.08em', padding: '2px 8px', cursor: 'pointer', flexShrink: 0 }}>DEL</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
