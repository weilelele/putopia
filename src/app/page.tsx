'use client'

import { useState, useEffect } from 'react'
import { submitApplication } from '@/lib/actions/applications'
import { getAllDevices } from '@/lib/actions/devices'
import { getPublicIntel } from '@/lib/actions/intel'
import { SectionTracker } from '@/components/section-tracker'
import type { Device, Intel } from '@/types/database'

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

const STATUS_STYLES = {
  available:    { color: '#20D890', border: 'rgba(32,216,144,0.3)' },
  needs_repair: { color: '#E83030', border: 'rgba(232,48,48,0.3)' },
  in_use:       { color: '#E85A00', border: 'rgba(232,90,0,0.3)' },
  unknown:      { color: '#4A5570', border: '#1A2238' },
}

const STATUS_LABELS: Record<string, string> = {
  available:    'AVAILABLE',
  needs_repair: 'NEEDS REPAIR',
  in_use:       'IN USE',
  unknown:      'UNKNOWN',
}

const TAG_COLOR: Record<string, string> = {
  NOTICE: 'var(--color-star-dim)',
  DEVICE: 'var(--color-nucleus)',
  ORG:    'var(--color-nebula)',
}

const BRAND_FILTER = 'grayscale(0.6) sepia(1) saturate(2.2) hue-rotate(-20deg) brightness(0.82)'

function DevicePlaceholder({ id }: { id: string }) {
  const seed = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const hue1 = (seed * 37) % 360
  const hue2 = (seed * 79) % 360
  const cx = 60 + (seed % 40)
  const cy = 60 + ((seed * 3) % 40)
  const r1 = 30 + (seed % 20)
  const r2 = 15 + (seed % 15)
  const lineX = 20 + (seed % 100)
  return (
    <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <rect width="160" height="120" fill="#0D1020" />
      {[20, 40, 60, 80, 100, 120, 140].map((x) => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="120" stroke="#1A2238" strokeWidth="0.5" opacity="0.5" />
      ))}
      {[20, 40, 60, 80, 100].map((y) => (
        <line key={`h${y}`} x1="0" y1={y} x2="160" y2={y} stroke="#1A2238" strokeWidth="0.5" opacity="0.5" />
      ))}
      <circle cx={cx} cy={cy} r={r1} fill="none" stroke={`hsl(${hue1},60%,45%)`} strokeWidth="1" opacity="0.6" />
      <circle cx={cx} cy={cy} r={r2} fill="none" stroke={`hsl(${hue1},60%,55%)`} strokeWidth="0.8" opacity="0.5" />
      <circle cx={cx} cy={cy} r="4" fill={`hsl(${hue1},70%,50%)`} opacity="0.8" />
      <line x1={lineX} y1="10" x2={lineX + 20} y2="110" stroke={`hsl(${hue2},50%,40%)`} strokeWidth="1" opacity="0.4" />
      <line x1={cx - 15} y1={cy} x2={cx + 15} y2={cy} stroke="#E85A00" strokeWidth="0.8" opacity="0.5" />
      <line x1={cx} y1={cy - 15} x2={cx} y2={cy + 15} stroke="#E85A00" strokeWidth="0.8" opacity="0.5" />
      <path d="M5,5 L5,15 M5,5 L15,5" stroke="#1E2840" strokeWidth="1.5" fill="none" />
      <path d="M155,5 L155,15 M155,5 L145,5" stroke="#1E2840" strokeWidth="1.5" fill="none" />
      <path d="M5,115 L5,105 M5,115 L15,115" stroke="#1E2840" strokeWidth="1.5" fill="none" />
      <path d="M155,115 L155,105 M155,115 L145,115" stroke="#1E2840" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

function DevicePreviewCard({ device }: { device: Device }) {
  const isUnknown = device.knowledge === 'unknown'
  const statusKey = (device.status ?? 'unknown') as keyof typeof STATUS_STYLES
  const style = STATUS_STYLES[statusKey] ?? STATUS_STYLES.unknown

  return (
    <div
      style={{
        background: 'var(--color-void)',
        border: '1px solid var(--bd-faint)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative', background: '#0A0D18' }}>
        {device.image_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={device.image_path}
            alt={device.name}
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              filter: isUnknown ? 'grayscale(1) brightness(0.5)' : undefined,
            }}
          />
        ) : (
          <DevicePlaceholder id={device.id} />
        )}
        {isUnknown && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--color-star-deep)',
          }}>
            [ UNCLASSIFIED ]
          </div>
        )}
      </div>
      <div style={{ padding: '0.75rem', flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--color-star-deep)', letterSpacing: '0.15em', marginBottom: '0.3rem' }}>
          {device.id}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-star)', marginBottom: '0.5rem' }}>
          {device.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em',
            color: style.color, border: `1px solid ${style.border}`, padding: '0.1rem 0.35rem',
          }}>
            {STATUS_LABELS[statusKey] ?? statusKey}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--color-star-deep)', letterSpacing: '0.1em' }}>
            {device.location}
          </span>
        </div>
      </div>
    </div>
  )
}

function IntelPreviewCard({ entry }: { entry: Intel }) {
  const color = TAG_COLOR[entry.tag] ?? 'var(--color-star-dim)'
  const hasImage = (entry.images?.length ?? 0) > 0

  return (
    <div
      style={{
        background: 'var(--color-void)',
        border: '1px solid var(--bd-faint)',
        borderLeft: `3px solid ${color}`,
        overflow: 'hidden',
      }}
    >
      {hasImage && (
        <div style={{ width: '100%', aspectRatio: '16/7', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.images[0]}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: BRAND_FILTER, display: 'block' }}
          />
        </div>
      )}
      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <span className="label-tag" style={{ color }}>{entry.tag}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--color-star-deep)', letterSpacing: '0.15em' }}>
            {new Date(entry.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
          </span>
        </div>
        <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-star)', marginBottom: '0.4rem', lineHeight: 1.4 }}>
          {entry.title}
        </h3>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-star-dim)', lineHeight: 1.6 }}>
          {entry.content.length > 100 ? entry.content.slice(0, 100) + '…' : entry.content}
        </p>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [form, setForm] = useState({ email: '' })
  const [selectedReason, setSelectedReason] = useState('')
  const [otherReasonText, setOtherReasonText] = useState('')
  const [selectedWorld, setSelectedWorld] = useState('')
  const [otherWorldText, setOtherWorldText] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [devices, setDevices] = useState<Device[]>([])
  const [latestIntel, setLatestIntel] = useState<Intel[]>([])

  useEffect(() => {
    getAllDevices().then((d) => setDevices(d.filter((dev) => dev.knowledge === 'known').slice(0, 3)))
    getPublicIntel().then((intel) => setLatestIntel(intel.slice(0, 2)))
  }, [])

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
      <SectionTracker section="dashboard" />
      <div className="nebula-bg" />

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

      {/* ── Known Devices ── */}
      {devices.length > 0 && (
        <section style={{ padding: '3rem 2.5rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.3em', color: 'var(--color-nucleus)' }}>
              KNOWN DEVICES
            </div>
            <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {devices.map((device) => (
              <DevicePreviewCard key={device.id} device={device} />
            ))}
          </div>
        </section>
      )}

      {/* ── Latest Intel ── */}
      {latestIntel.length > 0 && (
        <section style={{ padding: '1rem 2.5rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.3em', color: 'var(--color-star-dim)' }}>
              LATEST INTEL
            </div>
            <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {latestIntel.map((entry) => (
              <IntelPreviewCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      )}

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

      <div className="footer-bar" style={{ marginTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>PUTOPIA.COLLECTIVE</div>
      </div>
    </div>
  )
}
