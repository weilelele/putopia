'use client'

import { useEffect, useState } from 'react'
import { getArchiveReel } from '@/lib/actions/signal-tasks'
import type { ArchiveReel } from '@/lib/actions/signal-tasks'
import type { World } from '@/types/database'

type Slide =
  | { kind: 'day'; dayIndex: number; date: string | null; src: string }
  | { kind: 'final'; media: 'image' | 'video'; url: string; posterUrl: string | null; date: string | null }

/** "SIGNAL DISPATCH 6/21" from an ISO timestamp, or null. */
function dispatchLabel(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `SIGNAL DISPATCH ${d.getMonth() + 1}/${d.getDate()}`
}

/** Date portion (YYYY-MM-DD) of an ISO timestamp or date string. */
function ymd(s: string | null): string | null {
  if (!s) return null
  return s.slice(0, 10)
}

/** Reel slides, oldest→newest: each day's chosen result → the final form.
 *  Empty when the world has neither a tuning history nor a final form. */
function buildSlides(reel: ArchiveReel): Slide[] {
  const slides: Slide[] = []
  for (const d of reel.days) {
    if (!d.winner) continue
    slides.push({ kind: 'day', dayIndex: d.dayIndex, date: d.dispatchAt, src: d.winner.display_url || d.winner.processed_url || '' })
  }
  for (const f of reel.finalAssets) {
    slides.push({ kind: 'final', media: f.media, url: f.url, posterUrl: f.posterUrl, date: f.createdAt })
  }
  return slides
}

export function ArchiveReelView({ world }: { world: World }) {
  const [reel, setReel] = useState<ArchiveReel | null>(null)
  const [i, setI] = useState(0)
  useEffect(() => {
    getArchiveReel(world.id).then((r) => {
      setReel(r)
      const sl = buildSlides(r)
      const ff = sl.findIndex((s) => s.kind === 'final') // land on the final form
      setI(ff >= 0 ? ff : Math.max(0, sl.length - 1))
    })
  }, [world.id])

  const displayName = world.name_en || world.name
  const slides = reel ? buildSlides(reel) : []

  if (!reel || slides.length === 0) {
    return <PosterHero world={world} displayName={displayName} loading={!reel} />
  }

  const s = slides[Math.min(i, slides.length - 1)]
  const label = s.kind === 'final' ? 'FINAL FORM' : `DAY ${s.dayIndex + 1}`
  const sub = dispatchLabel(s.date)
  const tagColor = s.kind === 'final' ? '#20D890' : '#FF8A3D'
  const lockedAt = ymd(reel.lockedAt)

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ marginBottom: '1.1rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--color-star)', lineHeight: 1.2, letterSpacing: '0.02em' }}>{displayName}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', color: 'var(--color-star-deep)', marginTop: 6 }}>
          <span>{world.id}</span>
          <span>DISCOVERED {world.discovery_date}</span>
          {lockedAt && <span style={{ color: '#20D890' }}>OBSERVED {lockedAt}</span>}
        </div>
      </div>

      {/* Media viewer — day signals fill a square; the final form keeps its own
          aspect (letterboxed) so a landscape video reads cleanly. */}
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', position: 'relative', overflow: 'hidden', border: '1px solid rgba(227,82,5,0.25)', background: '#070912', ...(s.kind === 'day' ? { aspectRatio: '1' } : {}) }}>
        {s.kind === 'day' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.src} alt={`Day ${s.dayIndex + 1} signal`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        {s.kind === 'final' && (
          s.media === 'video'
            ? <video key={s.url} src={s.url} poster={s.posterUrl ?? undefined} autoPlay loop muted playsInline style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '70vh', objectFit: 'contain', background: '#070912' }} />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={s.url} alt="Final form" style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '70vh', objectFit: 'contain' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 10, left: 10, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', background: 'rgba(7,9,18,0.72)', padding: '3px 8px', color: tagColor }}>
          {s.kind === 'final' ? '● FINAL FORM' : `◉ DAY ${s.dayIndex + 1}`}
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, maxWidth: 480, margin: '12px auto 0' }}>
        <button onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i <= 0} aria-label="Earlier" style={navBtn(i <= 0)}>◀</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', fontWeight: 700, letterSpacing: '0.16em', color: 'var(--color-star)' }}>{label}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', color: 'var(--color-star-deep)', marginTop: 3, minHeight: 14 }}>{sub ?? ' '}</div>
        </div>
        <button onClick={() => setI((v) => Math.min(slides.length - 1, v + 1))} disabled={i >= slides.length - 1} aria-label="Later" style={navBtn(i >= slides.length - 1)}>▶</button>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 11 }}>
        {slides.map((_, k) => (
          <span key={k} onClick={() => setI(k)} style={{ width: 7, height: 7, borderRadius: '50%', cursor: 'pointer', background: k === i ? '#E35205' : 'rgba(245,245,245,0.22)' }} />
        ))}
      </div>
    </div>
  )
}

function navBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 38, height: 38, flex: 'none', background: 'rgba(227,82,5,0.08)',
    border: '1px solid rgba(227,82,5,0.4)', color: '#E35205', fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-label)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.25 : 1,
  }
}

/** Degraded hero for standalone Established worlds (no reel) + the loading state. */
function PosterHero({ world, displayName, loading }: { world: World; displayName: string; loading: boolean }) {
  return (
    <div style={{ width: '100%', height: '280px', position: 'relative', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid var(--bd-faint)' }}>
      {world.image_path && !loading ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={world.image_path} alt={displayName} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${world.gradient_from}, ${world.gradient_to})` }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(160,45,4,0.42) 60%, rgba(12,5,1,0.93) 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem 1.25rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h3)', fontWeight: 700, color: 'var(--color-star)', lineHeight: 1.2, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>{displayName}</div>
      </div>
    </div>
  )
}
