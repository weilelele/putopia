import Link from 'next/link'
import type { ReactNode } from 'react'

// Unified world card: the chosen atmosphere color (or uploaded image) fills the
// whole card as a background; eyebrow / title / description / author sit on top.
// One layout for every surface (Raw Imagination, Signal Tuning, Established,
// console dashboard) so all world visuals read consistently.

type PosterWorld = {
  id: string
  name: string
  name_en?: string | null
  description?: string | null
  gradient_from?: string | null
  gradient_to?: string | null
  image_path?: string | null
  discoverer_name?: string | null
  discoverer_avatar_url?: string | null
}

function initialsOf(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export function WorldPoster({
  world,
  cover,
  eyebrow,
  eyebrowColor = 'rgba(255,255,255,0.7)',
  date,
  descLines = 3,
  minHeight = 190,
  badge,
  hoverBorder = 'rgba(255,255,255,0.28)',
  orangeMask = false,
}: {
  world: PosterWorld
  cover?: string | null
  eyebrow: string
  eyebrowColor?: string
  date?: string | null
  descLines?: number
  minHeight?: number
  badge?: ReactNode
  hoverBorder?: string
  orangeMask?: boolean
}) {
  const displayName = world.name_en || world.name
  const bg = cover ?? world.image_path ?? null
  const from = world.gradient_from ?? '#13182E'
  const to = world.gradient_to ?? '#0A0E27'

  return (
    <Link
      href={`/worlds/${encodeURIComponent(world.id)}`}
      className="world-poster"
      style={{
        display: 'block', textDecoration: 'none', position: 'relative',
        minHeight, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        background: `linear-gradient(155deg, ${from}, ${to})`,
        ['--poster-hover' as string]: hoverBorder,
      }}
    >
      {bg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bg}
          alt=""
          className="world-poster-img"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      {/* Legibility fade — orange variant for Established cards, plain dark for others */}
      <div style={{ position: 'absolute', inset: 0, background: orangeMask
        ? 'linear-gradient(to bottom, transparent 15%, rgba(160,45,4,0.45) 45%, rgba(10,4,1,0.96) 65%, rgba(10,4,1,0.98) 100%)'
        : 'linear-gradient(to bottom, transparent 38%, rgba(0,0,0,0.6) 100%)'
      }} />
      {badge && <div style={{ position: 'absolute', top: 8, right: 8 }}>{badge}</div>}

      <div style={{ position: 'relative', padding: '13px 13px 12px', display: 'flex', flexDirection: 'column', minHeight, boxSizing: 'border-box' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.14em', color: eyebrowColor }}>
          {eyebrow}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.02em', marginBottom: 6, lineHeight: 1.25 }}>
          {displayName}
        </div>
        {world.description && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', lineHeight: 1.55, color: 'rgba(255,255,255,0.85)', marginBottom: 11, display: '-webkit-box', WebkitLineClamp: descLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {world.description}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,0.14)' }}>
          {world.discoverer_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={world.discoverer_avatar_url} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.25)' }} />
          ) : (
            <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 700, background: 'rgba(255,255,255,0.16)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.25)' }}>
              {initialsOf(world.discoverer_name)}
            </div>
          )}
          {world.discoverer_name && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              {world.discoverer_name}
            </span>
          )}
          {date && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', flexShrink: 0, marginLeft: 'auto' }}>
              {date}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
