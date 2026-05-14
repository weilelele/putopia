'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'

export default function LandingPage() {
  const [showContent, setShowContent] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', location: '', reason: '' })
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [otherText, setOtherText] = useState('')
  const { setRole } = useAuth()

  const reasons = [
    { id: 'anomaly', tag: 'ANOMALY DETECTED', text: 'I intercepted a signal I cannot explain.' },
    { id: 'referral', tag: 'REFERRAL', text: 'A current Voyager reached out to me directly.' },
    { id: 'verify', tag: 'VERIFICATION SEEKER', text: 'I need to verify that my world is not the only one.' },
    { id: 'contact', tag: 'DIRECT CONTACT', text: 'Something I witnessed through the device changed me.' },
    { id: 'other', tag: 'OTHER', text: 'Other — I will explain in my own words.' },
  ]

  const computedReason = selectedReason === 'other' ? otherText : (reasons.find(r => r.id === selectedReason)?.text ?? '')

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 600)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setRole('applicant')
    setForm((f) => ({ ...f, reason: computedReason }))
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <div style={{ background: '#070912' }}>
      {/* SECTION 1: Full-screen hero — image IS the design */}
      <section style={{ position: 'relative', height: '100vh', minHeight: '600px', overflow: 'hidden' }}>

        {/* Hero image — full bleed background */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero.jpg"
          alt="Putopia Collective"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />

        {/* Subtle gradient at bottom so scroll indicator stays legible */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '120px',
          background: 'linear-gradient(to top, rgba(7,9,18,0.7) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Interactive button layer — positioned to match the image's button area.
            The image is 16:9. Buttons appear at ~62% from top, centered in the
            content area (right of 240px sidebar). */}
        <div style={{
          position: 'absolute',
          inset: 0,
          // Offset from left sidebar width on desktop
          paddingLeft: 'max(240px, 15.8%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: '20%',
        }}>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href="#apply"
              className="btn-orange"
              style={{ fontSize: '0.8rem', padding: '0.9rem 2.2rem', letterSpacing: '0.15em' }}
            >
              ◈ &nbsp;BECOME A VOYAGER
            </a>
            <a
              href="/login"
              className="btn-teal"
              style={{ fontSize: '0.8rem', padding: '0.9rem 2.2rem', letterSpacing: '0.15em' }}
            >
              🔒 &nbsp;INTERNAL LOGIN
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute',
          bottom: '1.2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.55rem',
          letterSpacing: '0.2em',
          color: 'rgba(139,154,181,0.5)',
          textAlign: 'center',
          fontFamily: 'inherit',
        }}>
          <div style={{ marginBottom: '2px' }}>▼</div>
          <div>SCROLL TO APPLY</div>
        </div>
      </section>

      {/* SECTION 2: Application */}
      <section
        id="apply"
        className="min-h-screen flex items-center justify-center px-6 py-20"
        style={{ background: '#0D1020' }}
      >
        <div className="w-full max-w-xl">
          {/* Divider */}
          <div className="flex items-center gap-4 mb-10">
            <div className="flex-1 h-px" style={{ background: '#1A2238' }} />
            <div className="text-xs tracking-[0.3em] font-mono" style={{ color: '#E85A00' }}>RECRUITMENT OPEN</div>
            <div className="flex-1 h-px" style={{ background: '#1A2238' }} />
          </div>

          <div className="mb-8">
            <div className="text-xs tracking-[0.3em] font-mono mb-2" style={{ color: '#4A5570' }}>
              PORTAL // APPLICATION
            </div>
            <h2 className="text-2xl font-mono font-bold tracking-wider mb-3" style={{ color: '#EDE8DE' }}>
              JOIN THE COLLECTIVE
            </h2>
            <p className="text-sm font-mono leading-relaxed" style={{ color: '#8A9AB5' }}>
              Become a Voyager. Apply for access to a Multiverse Console.
            </p>
          </div>

          {submitted ? (
            <div
              className="border p-8 text-center"
              style={{
                background: '#111525',
                borderColor: '#20D890',
                boxShadow: '0 0 20px rgba(32,216,144,0.12)',
              }}
            >
              <div className="text-3xl font-mono mb-4" style={{ color: '#20D890' }}>[ ✓ ]</div>
              <div className="text-lg font-mono font-semibold mb-3" style={{ color: '#EDE8DE' }}>
                Application transmitted.
              </div>
              <div className="text-sm font-mono leading-relaxed" style={{ color: '#8A9AB5' }}>
                We will be in contact.
              </div>
              <div className="mt-4 text-xs font-mono" style={{ color: '#4A5570' }}>
                APPLICATION ID: {`APP-${Date.now().toString(36).toUpperCase()}`}
              </div>
              <div className="mt-1 text-xs font-mono" style={{ color: '#4A5570' }}>
                // YOUR ROLE HAS BEEN UPDATED TO: APPLICANT //
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div
                className="border p-5 space-y-5"
                style={{
                  background: '#111525',
                  borderColor: '#1E2840',
                }}
              >
                <div>
                  <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#4A5570' }}>
                    NAME
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name or alias"
                    className="input-dark"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#4A5570' }}>
                    EMAIL
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contact@domain.void"
                    className="input-dark"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#4A5570' }}>
                    LOCATION / REGION
                  </label>
                  <input
                    type="text"
                    required
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="City, Country"
                    className="input-dark"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono tracking-widest mb-2" style={{ color: '#4A5570' }}>
                    REASON FOR APPLYING
                  </label>
                  <div className="space-y-2">
                    {reasons.map((r) => {
                      const isSelected = selectedReason === r.id
                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedReason(r.id)}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all"
                          style={{
                            border: isSelected ? '1px solid #E85A00' : '1px solid #1A2238',
                            background: isSelected ? 'rgba(232,90,0,0.06)' : '#0D1020',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = '#1E2840'
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = '#1A2238'
                          }}
                        >
                          <span
                            className="shrink-0 font-mono font-bold"
                            style={{
                              fontSize: '0.55rem',
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                              color: isSelected ? '#E85A00' : '#4A5570',
                              minWidth: '110px',
                            }}
                          >
                            [{r.tag}]
                          </span>
                          <span
                            className="text-xs font-mono"
                            style={{ color: isSelected ? '#EDE8DE' : '#8A9AB5' }}
                          >
                            {r.text}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {selectedReason === 'other' && (
                    <textarea
                      required
                      rows={3}
                      maxLength={300}
                      value={otherText}
                      onChange={(e) => setOtherText(e.target.value)}
                      placeholder="Describe your reason in your own words..."
                      className="input-dark mt-2 resize-none"
                      style={{ height: 'auto' }}
                    />
                  )}
                  {!selectedReason && (
                    <input type="hidden" required value="" />
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedReason || (selectedReason === 'other' && !otherText.trim())}
                className="btn-orange w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ justifyContent: 'center' }}
              >
                {loading ? '> TRANSMITTING APPLICATION...' : 'SUBMIT APPLICATION'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs font-mono" style={{ color: '#1A2238' }}>
            // ALL APPLICATIONS ARE REVIEWED BY THE ARCHITECT COUNCIL //
          </div>
        </div>
      </section>
    </div>
  )
}
