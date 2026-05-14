'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ChevronDown } from 'lucide-react'

export default function LandingPage() {
  const [showContent, setShowContent] = useState(false)
  const [typedText, setTypedText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', location: '', reason: '' })
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [otherText, setOtherText] = useState('')
  const { setRole } = useAuth()
  const fullText = 'PUTOPIA COLLECTIVE // INTERNAL PLATFORM'

  const reasons = [
    { id: 'anomaly', tag: 'ANOMALY DETECTED', text: 'I intercepted a signal I cannot explain.' },
    { id: 'referral', tag: 'REFERRAL', text: 'A current Voyager reached out to me directly.' },
    { id: 'verify', tag: 'VERIFICATION SEEKER', text: 'I need to verify that my world is not the only one.' },
    { id: 'contact', tag: 'DIRECT CONTACT', text: 'Something I witnessed through the device changed me.' },
    { id: 'other', tag: 'OTHER', text: 'Other — I will explain in my own words.' },
  ]

  const computedReason = selectedReason === 'other' ? otherText : (reasons.find(r => r.id === selectedReason)?.text ?? '')

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        setTypedText(fullText.slice(0, i))
        i++
      } else {
        clearInterval(interval)
        setTimeout(() => setShowContent(true), 400)
      }
    }, 50)
    return () => clearInterval(interval)
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
    <div style={{ background: '#0F0A00' }}>
      {/* SECTION 1: Full viewport landing */}
      <section
        className="scanlines relative flex flex-col items-center justify-center min-h-screen px-8"
        style={{ background: '#0F0A00' }}
      >
        {/* Warm grid overlay */}
        <div
          className="fixed inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage:
              'linear-gradient(#5C4A1E 1px, transparent 1px), linear-gradient(90deg, #5C4A1E 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 text-center max-w-xl w-full">
          {/* System ID */}
          <div className="mb-8 text-xs tracking-[0.3em] font-mono" style={{ color: '#7A6A40' }}>
            SYS-ID: PTC-INTERNAL-2026 // ACCESS NODE: ALPHA
          </div>

          {/* Main header */}
          <div
            className="text-4xl md:text-5xl font-mono font-bold tracking-[0.12em] mb-2 min-h-[1.4em] flex items-center justify-center text-glow"
            style={{ color: '#E8A020' }}
          >
            {typedText}
            <span className="blink ml-1" style={{ color: '#E8A020' }}>█</span>
          </div>

          {/* Amber rule below title */}
          <div className="my-4 h-px w-full" style={{ background: 'linear-gradient(to right, transparent, rgba(232,160,32,0.35), transparent)' }} />

          {/* Divider */}
          <div className="my-4 flex items-center gap-4">
            <div className="flex-1 h-px" style={{ background: '#3D3010' }} />
            <div className="text-xs tracking-widest font-mono" style={{ color: '#5C4A1E' }}>▲ CLASSIFIED ▲</div>
            <div className="flex-1 h-px" style={{ background: '#3D3010' }} />
          </div>

          {/* Cryptic message */}
          <div
            className={`transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <p className="text-sm leading-relaxed mb-2 font-mono" style={{ color: '#7A6A40' }}>
              You have reached the boundary node.
            </p>
            <p className="text-sm leading-relaxed mb-2 font-mono" style={{ color: '#7A6A40' }}>
              This system is for authorized personnel only.
            </p>
            <p className="text-xs font-mono mb-8" style={{ color: '#3D3010' }}>
              — UNAUTHORIZED ACCESS WILL BE LOGGED AND REPORTED —
            </p>

            {/* Status indicators */}
            <div className="flex justify-center gap-4 mb-10 text-xs font-mono flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 border" style={{ borderColor: 'rgba(77,140,63,0.4)', background: 'rgba(77,140,63,0.06)' }}>
                <div className="w-1.5 h-1.5" style={{ background: '#4D8C3F', boxShadow: '0 0 6px #4D8C3F' }} />
                <span style={{ color: '#4D8C3F', letterSpacing: '0.12em' }}>SYSTEM ONLINE</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 border" style={{ borderColor: 'rgba(232,160,32,0.4)', background: 'rgba(232,160,32,0.06)' }}>
                <div className="w-1.5 h-1.5" style={{ background: '#E8A020', boxShadow: '0 0 6px #E8A020' }} />
                <span style={{ color: '#E8A020', letterSpacing: '0.12em' }}>7 NODES ACTIVE</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 border" style={{ borderColor: 'rgba(196,169,106,0.4)', background: 'rgba(196,169,106,0.06)' }}>
                <div className="w-1.5 h-1.5" style={{ background: '#C4A96A', boxShadow: '0 0 6px #C4A96A' }} />
                <span style={{ color: '#C4A96A', letterSpacing: '0.12em' }}>8 VOYAGERS</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/login"
                className="px-8 py-3 text-sm font-mono tracking-widest border transition-all duration-200"
                style={{
                  borderColor: '#E8A020',
                  color: '#E8A020',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.background = '#E8A020'
                  ;(e.target as HTMLElement).style.color = '#0F0A00'
                  ;(e.target as HTMLElement).style.boxShadow = '0 0 20px rgba(232,160,32,0.4)'
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = 'transparent'
                  ;(e.target as HTMLElement).style.color = '#E8A020'
                  ;(e.target as HTMLElement).style.boxShadow = 'none'
                }}
              >
                [ LOGIN ]
              </a>
              <a
                href="#apply"
                className="px-8 py-3 text-sm font-mono tracking-widest border transition-all duration-200"
                style={{
                  borderColor: '#5C4A1E',
                  color: '#7A6A40',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.background = '#2E2200'
                  ;(e.target as HTMLElement).style.color = '#C4A96A'
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = 'transparent'
                  ;(e.target as HTMLElement).style.color = '#7A6A40'
                }}
              >
                [ APPLY ]
              </a>
            </div>

            <div className="mt-10 text-xs font-mono" style={{ color: '#3D3010' }}>
              {'>'} PUTOPIA COLLECTIVE // INTERNAL MANAGEMENT PLATFORM // VERSION 2.6.0
            </div>
          </div>
        </div>

        {/* Scroll to apply indicator */}
        <div
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-all duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`}
        >
          <span className="text-xs font-mono tracking-widest" style={{ color: '#5C4A1E' }}>SCROLL TO APPLY</span>
          <ChevronDown size={16} style={{ color: '#E8A020' }} className="animate-bounce" />
        </div>
      </section>

      {/* SECTION 2: Application */}
      <section
        id="apply"
        className="min-h-screen flex items-center justify-center px-6 py-20"
        style={{ background: '#1A1200' }}
      >
        <div className="w-full max-w-xl">
          {/* Divider */}
          <div className="flex items-center gap-4 mb-10">
            <div className="flex-1 h-px" style={{ background: '#3D3010' }} />
            <div className="text-xs tracking-[0.3em] font-mono" style={{ color: '#E8A020' }}>RECRUITMENT OPEN</div>
            <div className="flex-1 h-px" style={{ background: '#3D3010' }} />
          </div>

          <div className="mb-8">
            <div className="text-xs tracking-[0.3em] font-mono mb-2" style={{ color: '#7A6A40' }}>
              PORTAL // APPLICATION
            </div>
            <h2 className="text-2xl font-mono font-bold tracking-wider mb-3" style={{ color: '#F5E6C8' }}>
              JOIN THE COLLECTIVE
            </h2>
            <p className="text-sm font-mono leading-relaxed" style={{ color: '#C4A96A' }}>
              Become a Voyager. Apply for access to a Multiverse Console.
            </p>
          </div>

          {submitted ? (
            <div
              className="border rounded p-8 text-center card-glow"
              style={{
                background: '#221800',
                borderColor: '#4D8C3F',
                boxShadow: '0 0 20px rgba(77,140,63,0.15), inset 0 1px 0 rgba(232,160,32,0.1)',
              }}
            >
              <div className="text-3xl font-mono mb-4" style={{ color: '#4D8C3F' }}>[ ✓ ]</div>
              <div className="text-lg font-mono font-semibold mb-3" style={{ color: '#F5E6C8' }}>
                Application transmitted.
              </div>
              <div className="text-sm font-mono leading-relaxed" style={{ color: '#C4A96A' }}>
                We will be in contact.
              </div>
              <div className="mt-4 text-xs font-mono" style={{ color: '#5C4A1E' }}>
                APPLICATION ID: {`APP-${Date.now().toString(36).toUpperCase()}`}
              </div>
              <div className="mt-1 text-xs font-mono" style={{ color: '#5C4A1E' }}>
                // YOUR ROLE HAS BEEN UPDATED TO: APPLICANT //
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div
                className="rounded border p-5 space-y-5 card-glow"
                style={{
                  background: '#221800',
                  borderColor: '#5C4A1E',
                }}
              >
                <div>
                  <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#7A6A40' }}>
                    NAME
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name or alias"
                    className="input-retro"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#7A6A40' }}>
                    EMAIL
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contact@domain.void"
                    className="input-retro"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#7A6A40' }}>
                    LOCATION / REGION
                  </label>
                  <input
                    type="text"
                    required
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="City, Country"
                    className="input-retro"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono tracking-widest mb-2" style={{ color: '#7A6A40' }}>
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
                            border: isSelected ? '1px solid #E8A020' : '1px solid #3D3010',
                            background: isSelected ? 'rgba(232,160,32,0.06)' : '#1A1200',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = '#5C4A1E'
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = '#3D3010'
                          }}
                        >
                          <span
                            className="shrink-0 font-mono font-bold"
                            style={{
                              fontSize: '0.55rem',
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                              color: isSelected ? '#E8A020' : '#5C4A1E',
                              minWidth: '110px',
                            }}
                          >
                            [{r.tag}]
                          </span>
                          <span
                            className="text-xs font-mono"
                            style={{ color: isSelected ? '#F5E6C8' : '#7A6A40' }}
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
                      className="input-retro mt-2 resize-none"
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
                className="btn-amber w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '> TRANSMITTING APPLICATION...' : 'SUBMIT APPLICATION'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs font-mono" style={{ color: '#3D3010' }}>
            // ALL APPLICATIONS ARE REVIEWED BY THE ARCHITECT COUNCIL //
          </div>
        </div>
      </section>
    </div>
  )
}
