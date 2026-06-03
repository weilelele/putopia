'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getIntelById } from '@/lib/actions/intel'
import type { Intel } from '@/types/database'
import posthog from 'posthog-js'
import { useAuth } from '@/lib/auth-context'
import { CommentThread } from '@/components/comment-thread'

const TAG_COLOR: Record<string, string> = {
  NOTICE: 'var(--color-star-dim)',
  DEVICE: 'var(--color-nucleus)',
  ORG:    'var(--color-nebula)',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function IntelDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const { user } = useAuth()
  const isGuest = user.role === 'guest'
  const backHref = isGuest ? '/console' : '/intel'
  const backLabel = isGuest ? '← DASHBOARD' : '← INTEL'

  const [entry, setEntry] = useState<Intel | null | undefined>(undefined)

  useEffect(() => {
    getIntelById(id).then((e) => {
      setEntry(e ?? null)
      if (e) posthog.capture('intel_viewed', { intel_id: id, intel_tag: e.tag, intel_title: e.title })
    })
  }, [id])

  if (entry === undefined) {
    return (
      <div className="main" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', letterSpacing: '0.18em' }}>LOADING...</div>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="main" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', color: 'var(--color-fault)', marginBottom: '1rem' }}>[ 404 ]</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-deep)', marginBottom: '1.5rem' }}>INTEL ENTRY NOT FOUND</div>
        <Link href={backHref} className="btn-ghost">← RETURN</Link>
      </div>
    )
  }

  const color = TAG_COLOR[entry.tag] ?? 'var(--color-star-dim)'
  const hasImages = (entry.images?.length ?? 0) > 0
  const isSingle  = entry.images?.length === 1

  return (
    <div className="main">
      <div className="top-bar">
        <div className="crumbs">
          {isGuest
            ? <>PC://WORKSPACE <span>/</span> DISPATCH</>
            : <>PC://CONSOLE <span>/</span> INTEL FEED <span>/</span> DISPATCH</>
          }
        </div>
        <div className="right">
          <div className="item">ID <span className="val">{id.slice(0, 8).toUpperCase()}</span></div>
        </div>
      </div>

      <div style={{ maxWidth: '720px', width: '100%' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href={backHref} className="btn-ghost" style={{ display: 'inline-flex' }}>{backLabel}</Link>
        </div>

        {/* HUD frame for the intel entry */}
        <div className="hud-frame" style={{ marginBottom: '2rem' }}>
          <div className="hud-tick-rail hud-tick-left" />
          <div className="hud-tick-rail hud-tick-right" />
          <div style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span className="label-tag" style={{ color }}>{entry.tag}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', letterSpacing: '0.18em' }}>{formatDate(entry.timestamp)}</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--fs-h3)', color: 'var(--color-star)', marginBottom: '1rem', lineHeight: 1.3 }}>
              {entry.title}
            </h1>

            {/* Publisher */}
            {entry.publisher_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.15em', color: 'var(--color-muted)' }}>PUBLISHED BY</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', color: 'var(--color-star-dim)', fontWeight: 600 }}>{entry.publisher_name}</span>
              </div>
            )}

            <div className="hr-cyan" />
            <article style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginTop: '1rem' }}>
              {entry.content}
            </article>
          </div>
        </div>

        {/* Full-color images — revealed at detail level */}
        {hasImages && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.25em', color: 'var(--color-star-deep)' }}>
                VISUAL ATTACHMENTS [{entry.images.length}]
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
            </div>

            {isSingle ? (
              <div style={{ width: '100%', overflow: 'hidden', border: '1px solid var(--bd-faint)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.images[0]}
                  alt="Intel attachment"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '4px' }}>
                {entry.images.map((url, i) => (
                  <div key={i} style={{ aspectRatio: '4/3', overflow: 'hidden', border: '1px solid var(--bd-faint)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Attachment ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Transmissions */}
        <CommentThread subjectType="intel" subjectId={entry.id} posthogEvent="intel_comment_sent" />
      </div>

      <div className="footer-bar" style={{ marginTop: 'auto', paddingTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>PUTOPIA.COLLECTIVE</div>
      </div>
    </div>
  )
}
