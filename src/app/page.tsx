'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitApplication } from '@/lib/actions/applications'

const reasons = [
  { id: 'anomaly', tag: 'ANOMALY DETECTED', text: 'I intercepted a signal I cannot explain.' },
  { id: 'referral', tag: 'REFERRAL', text: 'A current Voyager reached out to me directly.' },
  { id: 'verify', tag: 'VERIFICATION SEEKER', text: 'I need to verify that my world is not the only one.' },
  { id: 'contact', tag: 'DIRECT CONTACT', text: 'Something I witnessed through the device changed me.' },
  { id: 'other', tag: 'OTHER', text: 'Other — I will explain in my own words.' },
]

export default function LandingPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', location: '' })
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [otherText, setOtherText] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const computedReason = selectedReason === 'other'
    ? otherText
    : (reasons.find(r => r.id === selectedReason)?.text ?? '')

  const handleApply = async (e: React.FormEvent) => {
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
      setSubmitted(true)
    }
  }

  const scrollToApply = () => {
    document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="landing-root">
      {/* CLASSIFIED stamp */}
      <div className="classified-stamp">
        <div className="l1">CLASSIFIED</div>
        <div className="l2"><span className="stamp-wing" /> CLEARANCE LEVEL: VOYAGER <span className="stamp-wing" /></div>
        <div className="l3"><span className="stamp-wing" /> ACCESS GRANTED <span className="stamp-wing" /></div>
      </div>

      {/* Background layers */}
      <div className="stars-bg" />
      <div className="nebula-bg" />

      {/* ── Hero ── */}
      <section className="hero">
        <div className="eyebrow">WELCOME,</div>
        <h1 className="hero-title">
          <span className="sparkle sparkle-l">✦</span>
          VOYAGER
          <span className="sparkle sparkle-r">✦</span>
        </h1>
        <p className="hero-subtitle">
          YOU HAVE BEEN SELECTED TO EXPLORE<br />
          THE MYSTERIES OF PARALLEL WORLDS.
        </p>

        <div className="deco-diamond"><span /></div>

        <div className="device-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/device.png" alt="Multiverse Console" />
        </div>

        <div className="cta-row">
          {/* Scroll to apply form */}
          <button onClick={scrollToApply} className="cta">
            <div className="cta-bg" />
            <div className="cta-frame" />
            <div className="cta-icon-slot">
              <div className="cta-icon-circle">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 3 L13.2 10.8 L21 12 L13.2 13.2 L12 21 L10.8 13.2 L3 12 L10.8 10.8 Z" stroke="currentColor" strokeWidth="1.4" fill="rgba(255,90,31,0.15)" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div className="cta-divider" />
            <div className="cta-label">BECOME A VOYAGER</div>
          </button>

          <button onClick={() => router.push('/login')} className="cta teal">
            <div className="cta-bg" />
            <div className="cta-frame" />
            <div className="cta-icon-slot">
              <div className="cta-icon-circle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <rect x="5" y="11" width="14" height="10" rx="1" />
                  <path d="M8 11 V8 a4 4 0 0 1 8 0 V11" strokeLinecap="round" />
                  <circle cx="12" cy="16" r="1.3" fill="currentColor" />
                </svg>
              </div>
            </div>
            <div className="cta-divider" />
            <div className="cta-label">INTERNAL LOGIN</div>
          </button>
        </div>

        <div className="footer-tag">
          PUTOPIA COLLECTIVE <span className="dot">◆</span> EXPLORATION <span className="dot">◆</span> DISCOVERY <span className="dot">◆</span> UNITY
        </div>
      </section>

      {/* ── Apply section ── */}
      <section id="apply" className="apply-section">
        <div className="apply-inner">
          {submitted ? (
            <div className="apply-success">
              <div className="apply-success-icon">[ ✓ ]</div>
              <div className="apply-success-title">Application Transmitted.</div>
              <div className="apply-success-sub">We will review your application and be in contact.</div>
            </div>
          ) : (
            <>
              <div className="apply-header">
                <div className="apply-eyebrow">PORTAL // APPLICATION</div>
                <h2 className="apply-title">JOIN THE COLLECTIVE</h2>
                <p className="apply-sub">Become a Voyager. Apply for access to a Multiverse Console.</p>
              </div>

              <div className="apply-notice">
                <span className="apply-notice-label">⚠ NOTICE</span>
                All applications are reviewed by the Architect Council. Accurate information is required.
              </div>

              <form onSubmit={handleApply} className="apply-form">
                <div className="apply-row">
                  <div className="apply-field">
                    <label className="apply-label">NAME</label>
                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name or alias" className="input-dark" />
                  </div>
                  <div className="apply-field">
                    <label className="apply-label">EMAIL</label>
                    <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="operative@domain.void" className="input-dark" />
                  </div>
                </div>

                <div className="apply-field">
                  <label className="apply-label">LOCATION / REGION</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder="City, Country" className="input-dark" />
                </div>

                <div className="apply-field">
                  <label className="apply-label">REASON FOR APPLYING</label>
                  <div className="apply-reasons">
                    {reasons.map(r => {
                      const sel = selectedReason === r.id
                      return (
                        <div key={r.id} onClick={() => setSelectedReason(r.id)} className="apply-reason" data-selected={sel}>
                          <span className="apply-reason-tag">[{r.tag}]</span>
                          <span className="apply-reason-text">{r.text}</span>
                        </div>
                      )
                    })}
                  </div>
                  {selectedReason === 'other' && (
                    <textarea required rows={3} maxLength={300} value={otherText}
                      onChange={e => setOtherText(e.target.value)}
                      placeholder="Describe your reason..." className="input-dark apply-textarea" />
                  )}
                </div>

                {error && <div className="apply-error">{error}</div>}

                <button type="submit"
                  disabled={loading || !selectedReason || (selectedReason === 'other' && !otherText.trim())}
                  className="btn-orange apply-submit">
                  {loading ? '> TRANSMITTING...' : 'SUBMIT APPLICATION'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
