'use client'

import { useState } from 'react'

/* ─── Types ──────────────────────────────────────────────── */
type Platform = 'instagram' | 'twitter'

const CONTENT_TYPES = [
  { value: 'intel_dispatch',  label: 'INTEL DISPATCH',   desc: 'Org announcement or update' },
  { value: 'world_discovery', label: 'WORLD DISCOVERY',  desc: 'New parallel world reveal' },
  { value: 'device_reveal',   label: 'DEVICE REVEAL',    desc: 'Console or device spotlight' },
  { value: 'voyager_call',    label: 'VOYAGER CALL',     desc: 'Recruitment / invitation' },
  { value: 'transmission',    label: 'TRANSMISSION',     desc: 'Lore drop / atmosphere' },
  { value: 'free',            label: 'FREE FORM',        desc: 'No constraint' },
]

interface IntelItem  { id: string; title: string; tag: string; classified: boolean }
interface WorldItem  { id: string; name: string; description: string; discoverer_name: string }
interface DeviceItem { id: string; name: string; location: string; knowledge: string }

interface Props {
  intelList:   IntelItem[]
  worldsList:  WorldItem[]
  devicesList: DeviceItem[]
}

interface GenerateResult {
  instagram:          string
  twitter:            string
  image_prompt:       string
  image_prompt_short: string
  pollinations_url:   string
}

/* ─── Main Component ─────────────────────────────────────── */
export default function StudioForm({ intelList, worldsList, devicesList }: Props) {
  const [platforms,   setPlatforms]   = useState<Platform[]>(['instagram', 'twitter'])
  const [contentType, setContentType] = useState('intel_dispatch')
  const [referenceId, setReferenceId] = useState('')
  const [brief,       setBrief]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState<GenerateResult | null>(null)
  const [error,       setError]       = useState('')
  const [copied,      setCopied]      = useState<string | null>(null)
  const [imgLoaded,   setImgLoaded]   = useState(false)

  const togglePlatform = (p: Platform) =>
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleGenerate = async () => {
    if (!brief.trim() || platforms.length === 0) return
    setLoading(true)
    setError('')
    setResult(null)
    setImgLoaded(false)

    try {
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, platforms, contentType, referenceId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Generation failed')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const canGenerate = brief.trim().length > 0 && platforms.length > 0 && !loading

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

      {/* ══════════════ LEFT PANEL ══════════════ */}
      <div style={{
        width: 320, flexShrink: 0,
        borderRight: '1px solid var(--bd-faint)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>

        {/* Platforms */}
        <Section label="PLATFORM">
          <div style={{ display: 'flex', gap: 6 }}>
            {(['instagram', 'twitter'] as Platform[]).map(p => {
              const active = platforms.includes(p)
              return (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  style={{
                    flex: 1, padding: '9px 0',
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
                    background: active ? 'rgba(255,90,31,0.1)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(255,90,31,0.45)' : 'var(--bd-faint)'}`,
                    color: active ? 'var(--color-star)' : 'var(--color-star-deep)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {p === 'instagram' ? 'INSTAGRAM' : 'X / TWITTER'}
                </button>
              )
            })}
          </div>
        </Section>

        {/* Content type */}
        <Section label="CONTENT TYPE">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {CONTENT_TYPES.map(ct => {
              const active = contentType === ct.value
              return (
                <button
                  key={ct.value}
                  onClick={() => setContentType(ct.value)}
                  style={{
                    padding: '8px 10px', textAlign: 'left',
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em',
                    background: active ? 'rgba(255,90,31,0.08)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(255,90,31,0.3)' : 'transparent'}`,
                    color: active ? 'var(--color-star)' : 'var(--color-star-deep)',
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span>{ct.label}</span>
                  {active && (
                    <span style={{ fontSize: 8, color: 'var(--color-nucleus)', opacity: 0.7 }}>
                      {ct.desc}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </Section>

        {/* Reference — grouped select */}
        <Section label={<>REFERENCE <span style={{ fontSize: 8, opacity: 0.5, letterSpacing: '0.1em' }}>OPTIONAL</span></>}>
          <select
            value={referenceId}
            onChange={e => setReferenceId(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px',
              background: 'var(--color-void)', border: '1px solid var(--bd-faint)',
              color: referenceId ? 'var(--color-star)' : 'var(--color-star-deep)',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              cursor: 'pointer',
            }}
          >
            <option value="">— none —</option>
            <optgroup label="INTEL">
              {intelList.map(e => (
                <option key={e.id} value={e.id}>
                  [{e.tag}]{e.classified ? ' 🔒' : ''} {e.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="WORLDS">
              {worldsList.map(w => (
                <option key={`w-${w.id}`} value={`w-${w.id}`}>{w.name}</option>
              ))}
            </optgroup>
            <optgroup label="DEVICES">
              {devicesList.map(d => (
                <option key={`d-${d.id}`} value={`d-${d.id}`}>
                  [{d.knowledge.toUpperCase()}] {d.name}
                </option>
              ))}
            </optgroup>
          </select>
        </Section>

        {/* Brief */}
        <Section label="YOUR BRIEF" style={{ flex: 1 }}>
          <textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            placeholder={
              'Describe what you want to post.\n\n' +
              'Raw material, key message, tone, reference event — anything relevant.\n\n' +
              'The more specific, the better the output.'
            }
            style={{
              width: '100%', minHeight: 160,
              padding: 12,
              background: 'var(--color-void)', border: '1px solid var(--bd-faint)',
              color: 'var(--color-star)',
              fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.75,
              resize: 'vertical',
            }}
          />
        </Section>

        {/* Generate */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--bd-faint)' }}>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            style={{
              width: '100%', padding: '13px',
              fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '0.28em',
              background: canGenerate ? 'rgba(255,90,31,0.1)' : 'transparent',
              border: `1px solid ${canGenerate ? 'rgba(255,90,31,0.5)' : 'var(--bd-faint)'}`,
              color: canGenerate ? 'var(--color-star)' : 'var(--color-star-deep)',
              cursor: canGenerate ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              boxShadow: canGenerate ? '0 0 20px rgba(255,90,31,0.06)' : 'none',
            }}
            onMouseEnter={e => {
              if (!canGenerate) return
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(255,90,31,0.16)'
              el.style.boxShadow = '0 0 28px rgba(255,90,31,0.14)'
            }}
            onMouseLeave={e => {
              if (!canGenerate) return
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(255,90,31,0.1)'
              el.style.boxShadow = '0 0 20px rgba(255,90,31,0.06)'
            }}
          >
            {loading ? '> GENERATING...' : '> GENERATE'}
          </button>

          {error && (
            <div style={{
              marginTop: 10, fontSize: 9, letterSpacing: '0.12em',
              color: 'var(--color-fault)', lineHeight: 1.6,
            }}>
              ⚠ {error}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ RIGHT PANEL ══════════════ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Empty state */}
        {!result && !loading && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
            opacity: 0.35,
          }}>
            <div style={{
              width: 48, height: 48,
              border: '1px solid var(--bd-faint)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--color-nucleus)',
            }}>
              ◎
            </div>
            <div style={{ textAlign: 'center', lineHeight: 2 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, letterSpacing: '0.3em', color: 'var(--color-star)' }}>
                AWAITING TRANSMISSION
              </div>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--color-star-deep)', marginTop: 6 }}>
                configure inputs → generate
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14,
          }}>
            <ScanLine />
            <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--color-nebula)' }}>
              SIGNAL PROCESSING...
            </div>
            <div style={{ fontSize: 8, letterSpacing: '0.15em', color: 'var(--color-star-deep)', opacity: 0.6 }}>
              claude sonnet · prompt cache active
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Instagram */}
            {platforms.includes('instagram') && result.instagram && (
              <OutputCard
                label="INSTAGRAM"
                accentColor="var(--color-nucleus)"
                content={result.instagram}
                charCount={result.instagram.length}
                onCopy={() => copyText(result.instagram, 'ig')}
                isCopied={copied === 'ig'}
              />
            )}

            {/* X / Twitter */}
            {platforms.includes('twitter') && result.twitter && (
              <OutputCard
                label="X / TWITTER"
                accentColor="var(--color-nebula)"
                content={result.twitter}
                charCount={result.twitter.length}
                charLimit={280}
                onCopy={() => copyText(result.twitter, 'tw')}
                isCopied={copied === 'tw'}
              />
            )}

            {/* Image Prompt */}
            <div style={{ border: '1px solid var(--bd-faint)', background: 'var(--color-void)' }}>
              {/* Card header */}
              <div style={{
                padding: '10px 14px', borderBottom: '1px solid var(--bd-faint)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 9, letterSpacing: '0.25em', color: 'var(--color-ok)' }}>
                  IMAGE DIRECTION — LOVART
                </span>
                <CopyBtn
                  onCopy={() => copyText(result.image_prompt, 'img')}
                  isCopied={copied === 'img'}
                />
              </div>

              {/* Full prompt */}
              <div style={{ padding: '14px 14px 0', fontSize: 11, color: 'var(--color-star-dim)', lineHeight: 1.8 }}>
                {result.image_prompt}
              </div>

              {/* Pollinations preview */}
              <div style={{ padding: 14 }}>
                <div style={{
                  fontSize: 8, letterSpacing: '0.22em', color: 'var(--color-star-deep)',
                  marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span>DRAFT PREVIEW</span>
                  <span style={{ opacity: 0.45 }}>— Pollinations.ai · flux model · free</span>
                </div>

                {/* Image container */}
                <div style={{ position: 'relative', maxWidth: 320 }}>
                  {!imgLoaded && (
                    <div style={{
                      width: '100%', aspectRatio: '1',
                      background: 'var(--color-deep)',
                      border: '1px solid var(--bd-faint)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      <ScanLine small />
                      <div style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--color-star-deep)' }}>
                        RENDERING...
                      </div>
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.pollinations_url}
                    alt="AI draft preview"
                    onLoad={() => setImgLoaded(true)}
                    onError={() => setImgLoaded(true)}
                    style={{
                      width: '100%', maxWidth: 320,
                      display: imgLoaded ? 'block' : 'none',
                      filter: 'contrast(1.04) saturate(0.92)',
                    }}
                  />
                </div>

                <div style={{
                  marginTop: 10, fontSize: 8, letterSpacing: '0.15em',
                  color: 'var(--color-star-deep)', lineHeight: 1.8,
                }}>
                  → Copy the full prompt above into LovArt for production quality
                </div>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  )
}

/* ─── Sub-components ─────────────────────────────────────── */

function Section({
  label, children, style,
}: {
  label: React.ReactNode
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      padding: '16px 20px',
      borderBottom: '1px solid var(--bd-faint)',
      display: 'flex', flexDirection: 'column', gap: 10,
      ...style,
    }}>
      <div style={{ fontSize: 8, letterSpacing: '0.28em', color: 'var(--color-star-deep)' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function CopyBtn({ onCopy, isCopied }: { onCopy: () => void; isCopied: boolean }) {
  return (
    <button
      onClick={onCopy}
      style={{
        padding: '3px 10px',
        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.15em',
        background: isCopied ? 'rgba(32,216,144,0.08)' : 'transparent',
        border: `1px solid ${isCopied ? 'rgba(32,216,144,0.3)' : 'var(--bd-faint)'}`,
        color: isCopied ? 'var(--color-ok)' : 'var(--color-star-deep)',
        cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      {isCopied ? '✓ COPIED' : 'COPY'}
    </button>
  )
}

function OutputCard({
  label, accentColor, content, charCount, charLimit, onCopy, isCopied,
}: {
  label: string
  accentColor: string
  content: string
  charCount: number
  charLimit?: number
  onCopy: () => void
  isCopied: boolean
}) {
  const over = charLimit ? charCount > charLimit : false

  return (
    <div style={{
      border: '1px solid var(--bd-faint)',
      borderLeft: `3px solid ${accentColor}`,
      background: 'var(--color-void)',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--bd-faint)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 9, letterSpacing: '0.25em', color: accentColor }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 9, letterSpacing: '0.1em',
            color: over ? 'var(--color-fault)' : 'var(--color-star-deep)',
          }}>
            {charCount}{charLimit ? ` / ${charLimit}` : ''}
          </span>
          <CopyBtn onCopy={onCopy} isCopied={isCopied} />
        </div>
      </div>

      {/* Body */}
      <div style={{
        padding: 14, fontSize: 12,
        color: 'var(--color-star)', lineHeight: 1.85,
        whiteSpace: 'pre-wrap',
      }}>
        {content}
      </div>
    </div>
  )
}

function ScanLine({ small }: { small?: boolean }) {
  const size = small ? 28 : 40
  return (
    <div style={{
      width: size, height: size,
      border: '1px solid rgba(34,212,224,0.2)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(34,212,224,0.8), transparent)',
        animation: 'studioScan 1.4s linear infinite',
      }} />
      <style>{`
        @keyframes studioScan {
          0%   { top: -1px; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  )
}
