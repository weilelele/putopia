'use client'

import { useState } from 'react'
import { submitApplication } from '@/lib/actions/applications'

const reasons = [
  { id: 'anomaly', label: 'ANOMALY DETECTED — I intercepted a signal I cannot explain.' },
  { id: 'referral', label: 'REFERRAL — A current Voyager reached out to me directly.' },
  { id: 'verify', label: 'VERIFICATION SEEKER — I need to verify my world is not the only one.' },
  { id: 'contact', label: 'DIRECT CONTACT — Something witnessed through the device changed me.' },
  { id: 'other', label: 'OTHER — I will explain in my own words.' },
]

const worldOptions = [
  { id: 'new_life', label: 'A new possibility for life — a world where everything could be different.' },
  { id: 'fantasy',  label: 'A world long imagined — one I cannot stop thinking about.' },
  { id: 'reunion',  label: 'A precious reunion — someone or something I thought was lost.' },
  { id: 'other',    label: 'Other — I will describe it myself.' },
]

export default function LandingPage() {
  const [form, setForm] = useState({ email: '' })
  const [selectedReason, setSelectedReason] = useState('')
  const [otherReasonText, setOtherReasonText] = useState('')
  const [selectedWorld, setSelectedWorld] = useState('')
  const [otherWorldText, setOtherWorldText] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const computedReason = selectedReason === 'other'
    ? otherReasonText
    : (reasons.find(r => r.id === selectedReason)?.label.split(' — ')[1] ?? '')

  const computedWorld = selectedWorld === 'other'
    ? otherWorldText
    : (worldOptions.find(w => w.id === selectedWorld)?.label ?? '')

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReason || !selectedWorld) return
    setError('')
    setLoading(true)
    const result = await submitApplication({
      email: form.email,
      reason: computedReason,
      location: computedWorld,
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

  const canSubmit =
    form.email &&
    selectedReason &&
    (selectedReason !== 'other' || otherReasonText.trim()) &&
    selectedWorld &&
    (selectedWorld !== 'other' || otherWorldText.trim())

  return (
    <div className="landing-main">
      {/* Background layers */}
      <div className="nebula-bg" />

      {/* Top bar */}
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> DASHBOARD</div>
        <div className="right">
          <div className="item">UTC <span className="val">{new Date().toISOString().slice(11, 19)}</span></div>
          <div className="item">UPLINK <span className="val">ACTIVE</span></div>
        </div>
      </div>

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
        </div>


      </section>

      {/* ── Device showcase — click or scroll to apply ── */}
      <section
        className="device-showcase"
        onClick={scrollToApply}
        style={{ cursor: 'pointer' }}
        aria-label="Click to apply"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/device-desk.png"
          alt="Multiverse Console"
          className="device-showcase-img"
        />
        <div className="device-showcase-overlay">
          <div className="device-showcase-hint">
            <span>↓</span>
            <span>APPLY FOR ACCESS</span>
          </div>
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
                <div className="apply-field">
                  <label className="apply-label">EMAIL</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ email: e.target.value })}
                    placeholder="operative@domain.void"
                    className="input-dark"
                  />
                </div>

                <div className="apply-field">
                  <label className="apply-label">REASON FOR APPLYING</label>
                  <select
                    required
                    value={selectedReason}
                    onChange={e => { setSelectedReason(e.target.value); setOtherReasonText('') }}
                    className="input-dark apply-select"
                  >
                    <option value="" disabled>— Select a reason —</option>
                    {reasons.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                  {selectedReason === 'other' && (
                    <textarea
                      required
                      rows={3}
                      maxLength={300}
                      value={otherReasonText}
                      onChange={e => setOtherReasonText(e.target.value)}
                      placeholder="Describe your reason in your own words..."
                      className="input-dark apply-textarea"
                    />
                  )}
                </div>

                <div className="apply-field">
                  <label className="apply-label">WHAT KIND OF PARALLEL WORLD ARE YOU SEEKING?</label>
                  <select
                    required
                    value={selectedWorld}
                    onChange={e => { setSelectedWorld(e.target.value); setOtherWorldText('') }}
                    className="input-dark apply-select"
                  >
                    <option value="" disabled>— Select a world —</option>
                    {worldOptions.map(w => (
                      <option key={w.id} value={w.id}>{w.label}</option>
                    ))}
                  </select>
                  {selectedWorld === 'other' && (
                    <textarea
                      required
                      rows={2}
                      maxLength={200}
                      value={otherWorldText}
                      onChange={e => setOtherWorldText(e.target.value)}
                      placeholder="Describe the world you are looking for..."
                      className="input-dark apply-textarea"
                    />
                  )}
                </div>

                {error && <div className="apply-error">{error}</div>}

                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="btn-primary apply-submit"
                >
                  {loading ? '> TRANSMITTING...' : 'SUBMIT APPLICATION'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Footer bar */}
      <div className="footer-bar" style={{ marginTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>PUTOPIA.COLLECTIVE</div>
      </div>
    </div>
  )
}
