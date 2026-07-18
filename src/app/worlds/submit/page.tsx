'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { submitWorld } from '@/lib/actions/worlds'
import { ScanInitiation } from '@/components/scan-initiation'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { ArchiveSectionLabel } from '@/components/archive-section-label'

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
    <div className="archive-flow-page world-submit-page">
      {launched && (
        <ScanInitiation
          worldName={launched.name}
          onComplete={() => router.push(`/worlds/${encodeURIComponent(launched.id)}`)}
        />
      )}
      <div className="main archive-flow-main">
        <ArchiveBrandHeader />

        <div className="archive-flow-content">
          {/* Back link */}
          <div style={{ marginBottom: '1.5rem' }}>
            <ArchiveLinkButton href="/worlds" variant="ghost">← WORLD RECORDS</ArchiveLinkButton>
          </div>

          {/* Page head */}
          <div className="archive-flow-intro">
            <ArchivePageHeader title="REPORT A" accent="SIGHTING" />
            <p className="archive-flow-summary">
              Describe a parallel world you believe exists. Your account will be reviewed by Architects and added to the community pipeline. Evidence, observations, and field notes all welcome.
            </p>
          </div>

          {/* Guest warning */}
          {isGuest && (
            <div style={{
              padding: '1rem',
              border: '1px solid rgba(227,82,5,0.3)',
              background: 'rgba(227,82,5,0.06)',
              marginBottom: '1.5rem',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-caption)',
              color: 'rgba(245,245,245,0.7)',
            }}>
              <span style={{ color: '#E35205', letterSpacing: '0.12em' }}>ACCESS RESTRICTED</span>
              {' — '}You must be logged in to report a sighting.{' '}
              <Link href="/login" style={{ color: '#E35205', textDecoration: 'underline' }}>Login</Link>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>

            {/* World name */}
            <ArchiveField htmlFor="world-designation" label="WORLD DESIGNATION *">
              <input
                id="world-designation"
                type="text"
                placeholder="e.g. The Mirror Shore, World-7 Echo..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={isGuest || loading}
                maxLength={80}
              />
              <div className="archive-flow-counter">
                {form.name.length}/80
              </div>
            </ArchiveField>

            {/* Description */}
            <ArchiveField htmlFor="world-notes" label="FIELD NOTES * · MIN. 20 CHARS">
              <textarea
                id="world-notes"
                placeholder="Describe the world: what signals or evidence have you observed? What makes you believe this parallel world exists? Include any anomalies, patterns, or firsthand accounts..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                disabled={isGuest || loading}
                rows={7}
              />
              <div className={`archive-flow-counter${form.description.length < 20 ? ' is-pending' : ''}`}>
                {form.description.length} chars
              </div>
            </ArchiveField>

            {/* Gradient selector */}
            <section className="archive-flow-section">
              <ArchiveSectionLabel>ATMOSPHERE · MOOD TONE</ArchiveSectionLabel>
              <div className="world-tone-grid">
                {GRADIENT_PRESETS.map((preset) => {
                  const active = preset.label === form.gradient.label
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setForm({ ...form, gradient: preset })}
                      disabled={isGuest || loading}
                      className={`world-tone-option${active ? ' is-active' : ''}`}
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
                        color: active ? '#E35205' : 'rgba(245,245,245,0.35)',
                      }}>
                        {preset.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Image upload */}
            <section className="archive-flow-section">
              <ArchiveSectionLabel>EVIDENCE IMAGE · OPTIONAL</ArchiveSectionLabel>

              {/* Preview area */}
              <button
                type="button"
                className="world-upload-frame"
                disabled={isGuest || loading}
                aria-label={imagePreview ? 'Change evidence image' : 'Upload evidence image'}
                style={{ cursor: isGuest ? 'not-allowed' : 'pointer' }}
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
              </button>

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
            </section>

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
            <ArchiveButton
              type="submit"
              disabled={!canSubmit || isGuest}
              fullWidth
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
            </ArchiveButton>

            {!isGuest && !canSubmit && !loading && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.25)', marginTop: '0.5rem', textAlign: 'center', letterSpacing: '0.1em' }}>
                {form.name.trim().length === 0
                  ? 'Enter a world designation to continue'
                  : 'Add at least 20 characters of field notes'}
              </div>
            )}
          </form>

          {/* Footer note */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(227,82,5,0.1)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.2)', lineHeight: 1.7, letterSpacing: '0.05em' }}>
              All sightings are reviewed by Architects before advancing through the pipeline (Proposed → Picked → Syncing → Stable). Submitted records are visible to authenticated members of the Collective.
            </p>
          </div>

        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
