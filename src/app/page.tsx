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
      {/* SECTION 1: Full viewport landing */}
      <section
        className="starfield relative flex flex-col items-center justify-center min-h-screen px-6 md:px-8 overflow-hidden"
      >
        {/* CLASSIFIED stamp — top right */}
        <div style={{ position: 'absolute', top: '2rem', right: '2rem', zIndex: 10 }}>
          <div className="stamp">
            <div style={{ fontSize: '0.8rem', fontWeight: 900, letterSpacing: '0.15em' }}>CLASSIFIED</div>
            <div>CLEARANCE LEVEL: VOYAGER</div>
            <div>ACCESS GRANTED</div>
          </div>
        </div>

        <div
          className="relative z-10 text-center w-full max-w-2xl"
          style={{
            opacity: showContent ? 1 : 0,
            transform: showContent ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          {/* Welcome label */}
          <div
            className="font-mono tracking-[0.3em] mb-2"
            style={{ fontSize: '0.9rem', color: '#E85A00', letterSpacing: '0.3em' }}
          >
            WELCOME,
          </div>

          {/* Main heading */}
          <div
            className="font-mono font-bold glow-orange-text"
            style={{
              fontSize: 'clamp(3.5rem, 10vw, 6rem)',
              color: '#E85A00',
              letterSpacing: '0.08em',
              lineHeight: 1.05,
              marginBottom: '1rem',
            }}
          >
            VOYAGER
          </div>

          {/* Orange hr */}
          <div className="hr-orange" style={{ marginBottom: '1.5rem' }} />

          {/* Subtitle */}
          <p
            className="font-mono mb-6"
            style={{
              fontSize: '0.75rem',
              color: '#8A9AB5',
              letterSpacing: '0.12em',
              lineHeight: 1.8,
              textTransform: 'uppercase',
            }}
          >
            YOU HAVE BEEN SELECTED TO EXPLORE THE MYSTERIES OF PARALLEL WORLDS.
          </p>

          {/* Device CSS art */}
          <div style={{
            position: 'relative',
            width: '320px',
            height: '200px',
            margin: '2rem auto',
            background: 'linear-gradient(145deg, #1A2030, #0D1420)',
            border: '2px solid #2A3858',
            borderRadius: '8px',
            boxShadow: '0 0 40px rgba(232,90,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
          }}>
            {/* Left knob */}
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(145deg, #2A3858, #1A2530)', border: '2px solid #3A4868', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)', flexShrink: 0 }} />
            {/* Center screen / glow */}
            <div style={{
              width: '160px',
              height: '140px',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at 40% 35%, rgba(255,140,50,0.9) 0%, rgba(232,90,0,0.7) 25%, rgba(150,50,0,0.4) 55%, rgba(20,10,0,0.8) 80%, #070912 100%)',
              border: '3px solid #3A4868',
              boxShadow: '0 0 40px rgba(232,90,0,0.6), 0 0 80px rgba(232,90,0,0.2), inset 0 0 30px rgba(232,90,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulseOrange 2.5s ease-in-out infinite',
              flexShrink: 0,
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,200,100,0.9)', boxShadow: '0 0 20px rgba(255,180,50,0.8)' }} />
            </div>
            {/* Right knob */}
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(145deg, #2A3858, #1A2530)', border: '2px solid #3A4868', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: '8px', height: '24px', background: '#3A4868', borderRadius: '4px' }} />
            </div>
            {/* Bottom label */}
            <div style={{ position: 'absolute', bottom: '0.5rem', left: '50%', transform: 'translateX(-50%)', fontSize: '0.55rem', letterSpacing: '0.1em', color: '#4A5570', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Internal Device for Parallel World Connection
            </div>
            {/* Corner brackets */}
            {(['top', 'top', 'bottom', 'bottom'] as const).map((v, i) => {
              const h = i % 2 === 0 ? 'left' : 'right'
              return (
                <div key={i} style={{
                  position: 'absolute',
                  [v]: '8px',
                  [h]: '8px',
                  width: '14px',
                  height: '14px',
                  borderTop: v === 'top' ? '1.5px solid rgba(232,90,0,0.5)' : 'none',
                  borderBottom: v === 'bottom' ? '1.5px solid rgba(232,90,0,0.5)' : 'none',
                  borderLeft: h === 'left' ? '1.5px solid rgba(232,90,0,0.5)' : 'none',
                  borderRight: h === 'right' ? '1.5px solid rgba(232,90,0,0.5)' : 'none',
                }} />
              )
            })}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
            <a href="#apply" className="btn-orange">
              BECOME A VOYAGER
            </a>
            <a href="/login" className="btn-teal">
              INTERNAL LOGIN
            </a>
          </div>

          {/* Status indicators */}
          <div className="flex justify-center gap-4 mt-8 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 border font-mono" style={{ borderColor: 'rgba(32,216,144,0.4)', background: 'rgba(32,216,144,0.06)', fontSize: '0.65rem', letterSpacing: '0.1em', color: '#20D890' }}>
              <div className="w-1.5 h-1.5" style={{ background: '#20D890', boxShadow: '0 0 6px #20D890' }} />
              SYSTEM ONLINE
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 border font-mono" style={{ borderColor: 'rgba(232,90,0,0.4)', background: 'rgba(232,90,0,0.06)', fontSize: '0.65rem', letterSpacing: '0.1em', color: '#E85A00' }}>
              <div className="w-1.5 h-1.5" style={{ background: '#E85A00', boxShadow: '0 0 6px #E85A00' }} />
              7 NODES ACTIVE
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 border font-mono" style={{ borderColor: 'rgba(0,200,200,0.4)', background: 'rgba(0,200,200,0.06)', fontSize: '0.65rem', letterSpacing: '0.1em', color: '#00C8C8' }}>
              <div className="w-1.5 h-1.5" style={{ background: '#00C8C8', boxShadow: '0 0 6px #00C8C8' }} />
              8 VOYAGERS
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: 'absolute',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.6rem',
            letterSpacing: '0.2em',
            color: '#4A5570',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            fontWeight: 600,
          }}
        >
          PUTOPIA COLLECTIVE · EXPLORATION · DISCOVERY · UNITY
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
