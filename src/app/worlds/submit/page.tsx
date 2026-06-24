'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { submitWorld } from '@/lib/actions/worlds'
import { ScanInitiation } from '@/components/scan-initiation'

// Atmosphere tones — the chosen color becomes the whole world card's mood.
// Kept deep enough for white text to read, but with real hue so cards don't
// vanish into the page background (which the old near-black presets did).
const GRADIENT_PRESETS = [
  { label: 'VOID',   from: '#0E1138', to: '#2E2E8A' },
  { label: 'EMBER',  from: '#2A0810', to: '#7A1226' },
  { label: 'TIDE',   from: '#080F1E', to: '#1A4A7A' },
  { label: 'GROVE',  from: '#0A2412', to: '#1E6B34' },
  { label: 'DUSK',   from: '#1A0A28', to: '#4E1E7A' },
  { label: 'ASH',    from: '#161616', to: '#4A4A4A' },
]

function GradientPreview({ from, to }: { from: string; to: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg, ${from}, ${to})`,
        position: 'relative',
      }}
    >
      {/* scanlines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

export default function SubmitWorldPage() {
  const router = useRouter()
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    gradient: GRADIENT_PRESETS[0],
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Set once the sighting is filed — drives the Signal Scanning ceremony overlay.
  const [launched, setLaunched] = useState<{ id: string; name: string } | null>(null)

  const isGuest = user.role === 'guest'
  const canSubmit = form.name.trim().length > 0 && form.description.trim().length >= 20 && !loading

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    try {
      const result = await submitWorld({
        name: form.name.trim(),
        name_en: form.name.trim(),
        description: form.description.trim(),
        gradient_from: form.gradient.from,
        gradient_to: form.gradient.to,
      })

      if (result.error || !result.data) {
        setError(result.error ?? 'Submission failed')
        setLoading(false)
        return
      }

      // If there's an image, upload it via FormData
      if (imageFile && result.data) {
        const fd = new FormData()
        fd.append('worldId', result.data.id)
        fd.append('image', imageFile)
        // Fire-and-forget — image upload doesn't block success
        fetch('/api/worlds/upload-image', { method: 'POST', body: fd }).catch(() => null)
      }

      // Hand off to the Signal Scanning ceremony; it routes to the world after.
      setLaunched({ id: result.data.id, name: form.name.trim() })
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100vh', overflowY: 'auto' }}>
      {launched && (
        <ScanInitiation
          worldName={launched.name}
          onComplete={() => router.push(`/worlds/${encodeURIComponent(launched.id)}`)}
        />
      )}
      <div className="main">
        {/* Top bar */}
        <div className="top-bar">
          <div className="crumbs">PC://CONSOLE <span>/</span> WORLD RECORDS <span>/</span> REPORT</div>
        </div>

        <div style={{ maxWidth: '640px', width: '100%' }}>
          {/* Back link */}
          <div style={{ marginBottom: '1.5rem' }}>
            <Link href="/worlds" className="btn-ghost" style={{ display: 'inline-flex' }}>
              ← WORLD RECORDS
            </Link>
          </div>

          {/* Page head */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 700, color: '#F5F5F5', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
              REPORT A <span style={{ color: '#FF6B35' }}>SIGHTING</span>
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'rgba(245,245,245,0.55)', lineHeight: 1.7, maxWidth: '520px' }}>
              Describe a parallel world you believe exists. Your account will be reviewed by Architects and added to the community pipeline. Evidence, observations, and field notes all welcome.
            </p>
          </div>

          {/* Guest warning */}
          {isGuest && (
            <div style={{
              padding: '1rem',
              border: '1px solid rgba(255,107,53,0.3)',
              background: 'rgba(255,107,53,0.06)',
              marginBottom: '1.5rem',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-caption)',
              color: 'rgba(245,245,245,0.7)',
            }}>
              <span style={{ color: '#FF6B35', letterSpacing: '0.12em' }}>ACCESS RESTRICTED</span>
              {' — '}You must be logged in to report a sighting.{' '}
              <Link href="/login" style={{ color: '#FF6B35', textDecoration: 'underline' }}>Login</Link>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>

            {/* World name */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color: 'rgba(245,245,245,0.45)', marginBottom: '0.5rem' }}>
                WORLD DESIGNATION <span style={{ color: '#FF6B35' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. The Mirror Shore, World-7 Echo..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={isGuest || loading}
                maxLength={80}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--bd-cyan-2)',
                  color: 'var(--tx-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--fs-label)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.25)', marginTop: '0.25rem', textAlign: 'right' }}>
                {form.name.length}/80
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color: 'rgba(245,245,245,0.45)', marginBottom: '0.5rem' }}>
                FIELD NOTES <span style={{ color: '#FF6B35' }}>*</span>
                <span style={{ marginLeft: '1rem', color: 'rgba(245,245,245,0.25)', letterSpacing: '0.1em' }}>min. 20 chars</span>
              </label>
              <textarea
                placeholder="Describe the world: what signals or evidence have you observed? What makes you believe this parallel world exists? Include any anomalies, patterns, or firsthand accounts..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                disabled={isGuest || loading}
                rows={7}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--bd-cyan-2)',
                  color: 'var(--tx-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--fs-label)',
                  lineHeight: 1.75,
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                  minHeight: '160px',
                }}
              />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: form.description.length < 20 ? 'rgba(255,107,53,0.5)' : 'rgba(245,245,245,0.25)', marginTop: '0.25rem', textAlign: 'right' }}>
                {form.description.length} chars
              </div>
            </div>

            {/* Gradient selector */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color: 'rgba(245,245,245,0.45)', marginBottom: '0.75rem' }}>
                ATMOSPHERE
                <span style={{ marginLeft: '1rem', color: 'rgba(245,245,245,0.25)', letterSpacing: '0.1em' }}>mood tone</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {GRADIENT_PRESETS.map((preset) => {
                  const active = preset.label === form.gradient.label
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setForm({ ...form, gradient: preset })}
                      disabled={isGuest || loading}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'none',
                        border: `1px solid ${active ? 'rgba(255,107,53,0.6)' : 'rgba(255,107,53,0.15)'}`,
                        padding: '0.35rem',
                        cursor: 'pointer',
                        outline: 'none',
                        boxShadow: active ? '0 0 0 1px rgba(255,107,53,0.3)' : 'none',
                      }}
                    >
                      <div style={{
                        width: 48, height: 28,
                        background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                        border: '1px solid rgba(255,255,255,0.06)',
                      }} />
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--fs-caption)',
                        letterSpacing: '0.12em',
                        color: active ? '#FF6B35' : 'rgba(245,245,245,0.35)',
                      }}>
                        {preset.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Image upload */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color: 'rgba(245,245,245,0.45)', marginBottom: '0.75rem' }}>
                EVIDENCE IMAGE
                <span style={{ marginLeft: '1rem', color: 'rgba(245,245,245,0.25)', letterSpacing: '0.1em' }}>optional</span>
              </label>

              {/* Preview area */}
              <div
                style={{
                  width: '100%',
                  height: '180px',
                  border: '1px dashed rgba(255,107,53,0.28)',
                  background: 'var(--bg-panel)',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: isGuest ? 'not-allowed' : 'pointer',
                }}
                onClick={() => !isGuest && !loading && fileRef.current?.click()}
              >
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <GradientPreview from={form.gradient.from} to={form.gradient.to} />
                )}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: imagePreview ? 'rgba(0,0,0,0.4)' : 'transparent',
                  opacity: imagePreview ? 0 : 1,
                  transition: 'opacity 0.15s',
                }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = imagePreview ? '0' : '1' }}
                >
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--fs-caption)',
                    letterSpacing: '0.15em',
                    color: 'rgba(245,245,245,0.5)',
                    textAlign: 'center',
                    padding: '0.5rem',
                  }}>
                    {imagePreview ? '[ CHANGE IMAGE ]' : '[ CLICK TO UPLOAD ]'}<br />
                    <span style={{ color: 'rgba(245,245,245,0.25)', fontSize: 'var(--fs-caption)' }}>PNG · JPG · WEBP · MAX 5MB</span>
                  </div>
                </div>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />

              {imageFile && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)' }}>
                    {imageFile.name} ({(imageFile.size / 1024).toFixed(0)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = '' }}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em' }}
                  >
                    REMOVE
                  </button>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '0.75rem 1rem',
                border: '1px solid rgba(255,80,80,0.3)',
                background: 'rgba(255,80,80,0.06)',
                marginBottom: '1rem',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--fs-caption)',
                color: 'rgba(255,120,120,0.9)',
                letterSpacing: '0.05em',
              }}>
                ERROR: {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit || isGuest}
              style={{
                width: '100%',
                padding: '1rem',
                background: canSubmit && !isGuest
                  ? 'linear-gradient(135deg, #E85D04, #C04000)'
                  : 'rgba(255,107,53,0.08)',
                border: `1px solid ${canSubmit && !isGuest ? 'rgba(232,93,4,0.5)' : 'rgba(255,107,53,0.15)'}`,
                color: canSubmit && !isGuest ? '#F5F5F5' : 'rgba(245,245,245,0.25)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--fs-label)',
                fontWeight: 700,
                letterSpacing: '0.2em',
                cursor: canSubmit && !isGuest ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>◌</span>
                  TRANSMITTING...
                </>
              ) : isGuest ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                    <rect x="2.5" y="6.5" width="9" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M4.5 6.5V4.5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  LOGIN TO SUBMIT
                </>
              ) : (
                'FILE SIGHTING REPORT →'
              )}
            </button>

            {!isGuest && !canSubmit && !loading && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.25)', marginTop: '0.5rem', textAlign: 'center', letterSpacing: '0.1em' }}>
                {form.name.trim().length === 0
                  ? 'Enter a world designation to continue'
                  : 'Add at least 20 characters of field notes'}
              </div>
            )}
          </form>

          {/* Footer note */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,107,53,0.1)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.2)', lineHeight: 1.7, letterSpacing: '0.05em' }}>
              All sightings are reviewed by Architects before advancing through the pipeline (Proposed → Picked → Syncing → Stable). Submitted records are visible to authenticated members of the Collective.
            </p>
          </div>

        </div>

        <div className="footer-bar" style={{ marginTop: '2rem' }}>
          <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
          <div>WORLD ARCHIVE v2.9</div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, textarea:focus {
          border-color: rgba(255,107,53,0.4) !important;
          box-shadow: 0 0 0 1px rgba(255,107,53,0.15);
        }
      `}</style>
    </div>
  )
}
