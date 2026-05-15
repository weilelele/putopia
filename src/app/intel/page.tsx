'use client'

import Link from 'next/link'
import { getAllIntel } from '@/lib/actions/intel'
import { useEffect, useState } from 'react'
import type { Intel } from '@/types/database'

const TAG_COLOR: Record<string, string> = {
  NOTICE: 'var(--color-star-dim)',
  DEVICE: 'var(--color-nucleus)',
  ORG:    'var(--color-nebula)',
}

// CSS filter that tints images toward the nucleus orange brand color
const BRAND_FILTER = 'grayscale(0.6) sepia(1) saturate(2.2) hue-rotate(-20deg) brightness(0.82)'

function IntelCard({ entry }: { entry: Intel }) {
  const color = TAG_COLOR[entry.tag] ?? 'var(--color-star-dim)'
  const hasImages = (entry.images?.length ?? 0) > 0
  const isSingle  = entry.images?.length === 1

  return (
    <Link
      href={`/intel/${entry.id}`}
      className="block transition-all duration-150"
      style={{
        background: 'var(--color-void)',
        border: '1px solid var(--bd-faint)',
        borderLeft: `3px solid ${color}`,
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = color
        ;(e.currentTarget as HTMLElement).style.background = 'var(--color-void-2)'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd-faint)'
        ;(e.currentTarget as HTMLElement).style.background = 'var(--color-void)'
      }}
    >
      {/* Image area */}
      {hasImages && (
        isSingle ? (
          <div style={{ width: '100%', aspectRatio: '16/7', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.images[0]}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: BRAND_FILTER, display: 'block' }}
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', width: '100%' }}>
            {entry.images.slice(0, 3).map((url, i) => (
              <div key={i} style={{ aspectRatio: '1', overflow: 'hidden', position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: BRAND_FILTER, display: 'block' }}
                />
                {/* Show count on last visible tile if more than 3 */}
                {i === 2 && entry.images.length > 3 && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,9,18,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-star)', letterSpacing: '0.1em' }}>
                    +{entry.images.length - 3}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Content */}
      <div style={{ padding: '1rem' }}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="label-tag" style={{ color }}>{entry.tag}</span>
            {(entry.images?.length ?? 0) > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em', color: 'var(--color-star-deep)', border: '1px solid var(--bd-faint)', padding: '0.1rem 0.4rem' }}>
                {entry.images.length} IMG
              </span>
            )}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-star-deep)', letterSpacing: '0.15em' }}>
            {new Date(entry.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
          </span>
        </div>

        <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-star)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
          {entry.title}
        </h2>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-star-dim)', lineHeight: 1.6 }}>
          {entry.content.length > 120 ? entry.content.slice(0, 120) + '…' : entry.content}
        </p>

        {entry.publisher_name && (
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--color-muted)' }}>BY</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--color-star-deep)' }}>{entry.publisher_name}</span>
          </div>
        )}

        <div style={{ marginTop: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.18em', color, opacity: 0.7 }}>
          READ MORE →
        </div>
      </div>
    </Link>
  )
}

export default function IntelPage() {
  const [intel, setIntel] = useState<Intel[]>([])

  useEffect(() => {
    getAllIntel().then(setIntel)
  }, [])

  return (
    <div className="main">
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> INTEL FEED</div>
        <div className="right">
          <div className="item">ENTRIES <span className="val">{intel.length}</span></div>
          <div className="item">UTC <span className="val">{new Date().toISOString().slice(11, 19)}</span></div>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="h-eyebrow">// INTELLIGENCE</div>
          <h1>INTEL <span className="accent">FEED</span></h1>
          <p className="sub">Known intelligence — {intel.length} entries on record</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {(['NOTICE', 'DEVICE', 'ORG'] as const).map((tag) => (
            <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: TAG_COLOR[tag] }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.18em', color: TAG_COLOR[tag] }}>{tag}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', flex: 1 }}>
        {intel.map((entry) => <IntelCard key={entry.id} entry={entry} />)}
      </div>

      <div className="footer-bar" style={{ marginTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>LAST UPDATED: {intel[0] ? new Date(intel[0].timestamp).toLocaleDateString() : '—'}</div>
      </div>
    </div>
  )
}
