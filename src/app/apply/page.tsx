'use client'

import { useState } from 'react'
import { submitApplication } from '@/lib/actions/applications'

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
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#070912' }}>
        <div className="max-w-md w-full px-4 text-center">
          <div className="border p-8 mb-6" style={{ background: '#111525', borderColor: '#20D890', boxShadow: '0 0 20px rgba(32,216,144,0.12)' }}>
            <div className="text-3xl font-mono mb-4" style={{ color: '#20D890' }}>[ ✓ ]</div>
            <div className="text-lg font-mono font-semibold mb-2" style={{ color: '#EDE8DE' }}>
              Application Transmitted.
            </div>
            <div className="text-sm font-mono leading-relaxed" style={{ color: '#8A9AB5' }}>
              We will review your application and be in contact.
            </div>
            <div className="mt-4 text-xs font-mono" style={{ color: '#4A5570' }}>
              APPLICATION ID: {appId}
            </div>
          </div>
          <div className="text-xs font-mono" style={{ color: '#4A5570' }}>
            // YOUR APPLICATION IS PENDING ARCHITECT REVIEW //
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#070912' }}>
      <div className="max-w-xl mx-auto">
        <div className="mb-8 border-b pb-4" style={{ borderColor: '#1E2840' }}>
          <div className="text-xs tracking-[0.3em] font-mono mb-1" style={{ color: '#4A5570' }}>
            PORTAL // APPLICATION
          </div>
          <h1 className="text-2xl font-mono font-bold tracking-wider" style={{ color: '#EDE8DE' }}>
            JOIN THE COLLECTIVE
          </h1>
          <div className="text-xs font-mono mt-1" style={{ color: '#4A5570' }}>
            Become a Voyager. Apply for access to a Multiverse Console.
          </div>
        </div>

        <div className="mb-6 p-4 border text-xs font-mono leading-relaxed" style={{ background: 'rgba(232,90,0,0.04)', borderColor: 'rgba(232,90,0,0.25)', color: '#E85A00' }}>
          <div className="font-semibold mb-1">⚠ NOTICE TO APPLICANTS</div>
          <div style={{ color: '#8A9AB5' }}>
            All application information will be reviewed by the Architect Council. Upon successful admission,
            you will become a Putopia Collective Voyager with device access and log publishing rights.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#4A5570' }}>NAME</label>
            <input
              type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name or alias" className="input-dark"
            />
          </div>

          <div>
            <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#4A5570' }}>EMAIL</label>
            <input
              type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contact@domain.void" className="input-dark"
            />
          </div>

          <div>
            <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#4A5570' }}>LOCATION / REGION</label>
            <input
              type="text" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="City, Country" className="input-dark"
            />
          </div>

          <div>
            <label className="block text-xs font-mono tracking-widest mb-2" style={{ color: '#4A5570' }}>REASON FOR APPLYING</label>
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
                  >
                    <span className="shrink-0 font-mono font-bold" style={{ fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: isSelected ? '#E85A00' : '#4A5570', minWidth: '110px' }}>
                      [{r.tag}]
                    </span>
                    <span className="text-xs font-mono" style={{ color: isSelected ? '#EDE8DE' : '#8A9AB5' }}>
                      {r.text}
                    </span>
                  </div>
                )
              })}
            </div>
            {selectedReason === 'other' && (
              <textarea
                required rows={3} maxLength={300} value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Describe your reason in your own words..."
                className="input-dark mt-2 resize-none"
              />
            )}
          </div>

          {error && (
            <div className="text-xs font-mono py-2 px-3 border" style={{ color: '#E83030', borderColor: 'rgba(232,48,48,0.3)', background: 'rgba(232,48,48,0.08)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedReason || (selectedReason === 'other' && !otherText.trim())}
            className="btn-orange w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ justifyContent: 'center' }}
          >
            {loading ? '> TRANSMITTING APPLICATION...' : 'SUBMIT APPLICATION'}
          </button>
        </form>
      </div>
    </div>
  )
}
