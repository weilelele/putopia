'use client'

import { useState } from 'react'
import { submitApplication } from '@/lib/actions/applications'
import posthog from 'posthog-js'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveField } from '@/components/archive-field'
import { ArchivePageHeader } from '@/components/archive-page-header'

const reasons = [
  { id: 'anomaly', tag: 'ANOMALY DETECTED', text: 'I intercepted a signal I cannot explain.' },
  { id: 'referral', tag: 'REFERRAL', text: 'A current Voyager reached out to me directly.' },
  { id: 'verify', tag: 'VERIFICATION SEEKER', text: 'I need to verify that my world is not the only one.' },
  { id: 'contact', tag: 'DIRECT CONTACT', text: 'Something I witnessed through the device changed me.' },
  { id: 'other', tag: 'OTHER', text: 'Other — I will explain in my own words.' },
]

export default function ApplyPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [appId] = useState(() => `APP-${Date.now().toString(36).toUpperCase()}`)
  const [form, setForm] = useState({ name: '', email: '', location: '' })
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [otherText, setOtherText] = useState('')

  const computedReason = selectedReason === 'other'
    ? otherText
    : (reasons.find(r => r.id === selectedReason)?.text ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReason) return
    setError('')
    setLoading(true)

    const result = await submitApplication({
      name: form.name,
      email: form.email,
      location: form.location || null,
      reason: computedReason,
    })

    setLoading(false)
    if (result.error) {
      setError(`ERR: ${result.error}`)
    } else {
      posthog.capture('application_submitted', {
        reason_category: selectedReason,
        has_location: !!form.location,
      })
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="main pilot-archive-page archive-collection-page archive-apply-page archive-apply-success">
        <ArchiveBrandHeader />
        <div className="top-bar">
          <div className="crumbs">PC://CONSOLE <span>/</span> APPLICATION <span>/</span> TRANSMITTED</div>
        </div>
        <div className="archive-apply-shell">
          <ArchiveCard className="archive-apply-confirmation">
            <div>
              <div className="archive-confirmation-mark">✓</div>
              <div className="text-lg font-mono font-semibold mb-2" style={{ color: 'var(--color-star)' }}>
                Application Transmitted.
              </div>
              <div className="text-sm font-mono leading-relaxed" style={{ color: 'var(--color-star-deep)' }}>
                We will review your application and be in contact.
              </div>
              <div className="mt-4 text-xs font-mono" style={{ color: 'var(--color-star-deep)' }}>
                APPLICATION ID: {appId}
              </div>
            </div>
          </ArchiveCard>
          <div className="archive-status-note">PENDING ARCHITECT REVIEW</div>
        </div>
        <div className="footer-bar archive-footer-bar">
          <div className="tag">MULTIVERSE COLLECTIVE</div>
          <div>APPLICATION</div>
        </div>
      </div>
    )
  }

  return (
    <div className="main pilot-archive-page archive-collection-page archive-apply-page">
      <ArchiveBrandHeader />
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> APPLICATION</div>
      </div>

      <div className="archive-apply-shell">
        <ArchivePageHeader title="JOIN THE" accent="COLLECTIVE" />
        <p className="archive-page-intro">Become a Voyager. Apply for access to a Multiverse Console.</p>

        <ArchiveCard className="archive-application-notice">
          <h2>NOTICE TO APPLICANTS</h2>
          <p>
            All application information will be reviewed by the Architect Council. Upon successful admission,
            you will become a Multiverse Collective Voyager with device access and log publishing rights.
          </p>
        </ArchiveCard>

        <form onSubmit={handleSubmit} className="archive-apply-form">
          <ArchiveField htmlFor="application-name" label="NAME">
              <input
                id="application-name"
                type="text" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name or alias"
              />
          </ArchiveField>

          <ArchiveField htmlFor="application-email" label="EMAIL">
              <input
                id="application-email"
                type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contact@domain.void"
              />
          </ArchiveField>

          <ArchiveField htmlFor="application-location" label="LOCATION / REGION">
              <input
                id="application-location"
                type="text" value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="City, Country"
              />
          </ArchiveField>

          <div>
            <div className="archive-field__label">REASON FOR APPLYING</div>
            <div className="archive-reason-list">
              {reasons.map((r) => {
                const isSelected = selectedReason === r.id
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setSelectedReason(r.id)}
                    aria-pressed={isSelected}
                    className={`archive-reason-option${isSelected ? ' is-selected' : ''}`}
                  >
                    <span className="archive-reason-option__tag">
                      {r.tag}
                    </span>
                    <span className="archive-reason-option__copy">
                      {r.text}
                    </span>
                  </button>
                )
              })}
            </div>
            {selectedReason === 'other' && (
              <ArchiveField htmlFor="application-other-reason" label="YOUR REASON">
                <textarea
                  id="application-other-reason"
                  required rows={3} maxLength={300} value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="Describe your reason in your own words..."
                />
              </ArchiveField>
            )}
          </div>

          {error && (
            <div className="text-xs font-mono py-2 px-3 border" style={{ color: '#E83030', borderColor: 'rgba(232,48,48,0.3)', background: 'rgba(232,48,48,0.08)' }}>
              {error}
            </div>
          )}

          <ArchiveButton
            type="submit"
            disabled={loading || !selectedReason || (selectedReason === 'other' && !otherText.trim())}
            fullWidth
            variant="primary"
          >
            {loading ? 'TRANSMITTING APPLICATION...' : 'SUBMIT APPLICATION'}
          </ArchiveButton>
        </form>
      </div>

      <div className="footer-bar archive-footer-bar">
        <div className="tag">MULTIVERSE COLLECTIVE</div>
        <div>APPLICATION</div>
      </div>
    </div>
  )
}
