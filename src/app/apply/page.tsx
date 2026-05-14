'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'

const reasons = [
  { id: 'anomaly', tag: 'ANOMALY DETECTED', text: 'I intercepted a signal I cannot explain.' },
  { id: 'referral', tag: 'REFERRAL', text: 'A current Voyager reached out to me directly.' },
  { id: 'verify', tag: 'VERIFICATION SEEKER', text: 'I need to verify that my world is not the only one.' },
  { id: 'contact', tag: 'DIRECT CONTACT', text: 'Something I witnessed through the device changed me.' },
  { id: 'other', tag: 'OTHER', text: 'Other — I will explain in my own words.' },
]

export default function ApplyPage() {
  const { setRole, isAtLeast } = useAuth()
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    location: '',
    reason: '',
  })
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [otherText, setOtherText] = useState('')

  const computedReason = selectedReason === 'other' ? otherText : (reasons.find(r => r.id === selectedReason)?.text ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setRole('applicant')
    setForm((f) => ({ ...f, reason: computedReason }))
    setLoading(false)
    setSubmitted(true)
  }

  if (isAtLeast('voyager')) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0F0A00' }}>
        <div className="text-center max-w-md px-4">
          <div className="text-4xl mb-4 font-mono" style={{ color: '#4D8C3F' }}>✓</div>
          <div className="text-lg font-mono font-semibold mb-2" style={{ color: '#F5E6C8' }}>
            Identity Verified
          </div>
          <div className="text-sm font-mono" style={{ color: '#C4A96A' }}>
            You are already a member of the Collective. No further application required.
          </div>
          <div className="mt-2 text-xs font-mono" style={{ color: '#5C4A1E' }}>
            IDENTITY ALREADY VERIFIED // ACCESS GRANTED
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0F0A00' }}>
        <div className="max-w-md w-full px-4 text-center">
          <div
            className="border rounded p-8 mb-6"
            style={{
              background: '#221800',
              borderColor: '#4D8C3F',
              boxShadow: '0 0 20px rgba(77,140,63,0.15), inset 0 1px 0 rgba(232,160,32,0.1)',
            }}
          >
            <div className="text-3xl font-mono mb-4" style={{ color: '#4D8C3F' }}>[ ✓ ]</div>
            <div className="text-lg font-mono font-semibold mb-2" style={{ color: '#F5E6C8' }}>
              Application Transmitted.
            </div>
            <div className="text-sm font-mono leading-relaxed" style={{ color: '#C4A96A' }}>
              We will be in contact.
            </div>
            <div className="mt-4 text-xs font-mono" style={{ color: '#5C4A1E' }}>
              APPLICATION ID: {`APP-${Date.now().toString(36).toUpperCase()}`}
            </div>
          </div>
          <div className="text-xs font-mono" style={{ color: '#5C4A1E' }}>
            // YOUR ROLE HAS BEEN UPDATED TO: APPLICANT //
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#0F0A00' }}>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-8 border-b pb-4" style={{ borderColor: '#5C4A1E' }}>
          <div className="text-xs tracking-[0.3em] font-mono mb-1" style={{ color: '#7A6A40' }}>
            PORTAL // APPLICATION
          </div>
          <h1 className="text-2xl font-mono font-bold tracking-wider" style={{ color: '#F5E6C8' }}>
            JOIN THE COLLECTIVE
          </h1>
          <div className="text-xs font-mono mt-1" style={{ color: '#7A6A40' }}>
            Become a Voyager. Apply for access to a Multiverse Console.
          </div>
        </div>

        {/* Notice */}
        <div
          className="mb-6 p-4 rounded border text-xs font-mono leading-relaxed"
          style={{ background: 'rgba(232,160,32,0.05)', borderColor: 'rgba(232,160,32,0.3)', color: '#E8A020' }}
        >
          <div className="font-semibold mb-1">⚠ NOTICE TO APPLICANTS</div>
          <div style={{ color: '#C4A96A' }}>
            All application information will be reviewed by the Architect Council. Upon successful admission,
            you will become a Putopia Collective Voyager with device access and log publishing rights. Please
            ensure all information provided is accurate.
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
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
          </div>

          <button
            type="submit"
            disabled={loading || !selectedReason || (selectedReason === 'other' && !otherText.trim())}
            className="btn-amber w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '> TRANSMITTING APPLICATION...' : 'SUBMIT APPLICATION'}
          </button>
        </form>
      </div>
    </div>
  )
}
