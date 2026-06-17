'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getWorldById } from '@/lib/actions/worlds'
import { getWorldInvestigation } from '@/lib/actions/signal-tasks'
import type { WorldInvestigationData } from '@/lib/actions/signal-tasks'
import type { World } from '@/types/database'
import posthog from 'posthog-js'
import { useAuth } from '@/lib/auth-context'
import { CommentThread } from '@/components/comment-thread'
import { InvestigationCard } from '@/app/signal/SignalFeed'

const DESC_CLAMP = 320 // chars before the "expand all" fold

export default function WorldDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const { user } = useAuth()
  const isGuest = user.role === 'guest'
  const backHref = isGuest ? '/console' : '/worlds'
  const backLabel = isGuest ? '← DASHBOARD' : '← WORLD RECORDS'

  const [world, setWorld] = useState<World | null | undefined>(undefined)
  const [inv, setInv] = useState<WorldInvestigationData | null>(null)
  const [descExpanded, setDescExpanded] = useState(false)

  useEffect(() => {
    getWorldById(id).then((w) => {
      setWorld(w ?? null)
      if (w) posthog.capture('world_viewed', { world_id: id, world_name: w.name_en || w.name })
    })
    getWorldInvestigation(id).then(setInv)
  }, [id])

  const refreshInvestigation = () => getWorldInvestigation(id).then(setInv)

  if (world === undefined) {
    return (
      <div className="main" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', letterSpacing: '0.18em' }}>LOADING...</div>
      </div>
    )
  }

  if (!world) {
    return (
      <div className="main" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', color: 'var(--color-fault)', marginBottom: '1rem' }}>[ 404 ]</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-deep)', marginBottom: '1.5rem' }}>WORLD ENTRY NOT FOUND</div>
        <Link href={backHref} className="btn-ghost">← RETURN</Link>
      </div>
    )
  }

  const displayName = world.name_en || world.name
  const hasImage = !!world.image_path

  return (
    <div className="main">
      <div className="top-bar">
        <div className="crumbs">
          {isGuest
            ? <>PC://WORKSPACE <span>/</span> WORLD RECORDS</>
            : <>PC://CONSOLE <span>/</span> WORLD RECORDS <span>/</span> {world.id}</>
          }
        </div>
        <div className="right">
          <div className="item">ID <span className="val">{world.id}</span></div>
        </div>
      </div>

      <div style={{ maxWidth: '720px', width: '100%' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href={backHref} className="btn-ghost" style={{ display: 'inline-flex' }}>{backLabel}</Link>
        </div>

        {/* Hero — image or gradient */}
        <div style={{ width: '100%', height: '280px', position: 'relative', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid var(--bd-faint)' }}>
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={world.image_path!}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${world.gradient_from}, ${world.gradient_to})` }} />
          )}
          {/* scanline overlay */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)', pointerEvents: 'none' }} />
          {/* bottom fade — transparent → warm orange tint → near-black, keeps title legible over busy images */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(160,45,4,0.42) 60%, rgba(12,5,1,0.93) 100%)', pointerEvents: 'none' }} />
          {/* ID badge */}
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.15em', background: 'rgba(7,9,18,0.75)', color: 'var(--color-star-deep)', padding: '3px 8px', border: '1px solid var(--bd-faint)' }}>
              {world.id}
            </span>
          </div>
          {/* Verified badge */}
          {world.is_verified && (
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', background: 'rgba(232,93,4,0.15)', color: 'var(--color-nebula)', padding: '3px 8px', border: '1px solid rgba(232,93,4,0.3)' }}>
                ✓ VERIFIED
              </span>
            </div>
          )}
          {/* Title overlay at bottom */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem 1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h3)', fontWeight: 700, color: 'var(--color-star)', lineHeight: 1.2, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
              {displayName}
            </div>
          </div>
        </div>

        {/* Meta bar */}
        <div className="hud-frame" style={{ marginBottom: '1.5rem' }}>
          <div className="hud-tick-rail hud-tick-left" />
          <div className="hud-tick-rail hud-tick-right" />
          <div style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>DISCOVERED BY</div>
                {world.discoverer_id ? (
                  <Link href="/voyagers" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-nebula)', textDecoration: 'none', fontWeight: 600 }}>
                    {world.discoverer_name}
                  </Link>
                ) : (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)', fontWeight: 600 }}>{world.discoverer_name || '—'}</div>
                )}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>DISCOVERY DATE</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)' }}>{world.discovery_date}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Voting Node — the world's Signal Tuning, votable inline */}
        {inv?.investigation && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.25em', color: 'var(--color-nebula)' }}>
                {'// SIGNAL TUNING'}
              </div>
              {inv.investigation.lockReason && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', color: '#E8A020' }}>
                  ● {inv.investigation.lockReason}
                </div>
              )}
            </div>
            <InvestigationCard
              investigation={inv.investigation}
              onFiled={refreshInvestigation}
              showTitle={false}
            />
          </div>
        )}

        {/* Detail Text — creator's initial vision (collapsible) */}
        <div className="hud-frame" style={{ marginBottom: '2rem' }}>
          <div className="hud-tick-rail hud-tick-left" />
          <div className="hud-tick-rail hud-tick-right" />
          <div style={{ padding: '0 1rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.25em', color: 'var(--color-star-deep)', marginBottom: '0.75rem' }}>FIELD NOTES</div>
            <div className="hr-cyan" />
            <div style={{ position: 'relative', marginTop: '1rem' }}>
              <article style={{
                fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)',
                lineHeight: 1.85, whiteSpace: 'pre-wrap',
                maxHeight: descExpanded || world.description.length <= DESC_CLAMP ? 'none' : '7.5rem',
                overflow: 'hidden',
              }}>
                {world.description}
              </article>
              {!descExpanded && world.description.length > DESC_CLAMP && (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '3rem', background: 'linear-gradient(to bottom, transparent, var(--bg-panel, #0F1430))', pointerEvents: 'none' }} />
              )}
            </div>
            {world.description.length > DESC_CLAMP && (
              <button
                onClick={() => setDescExpanded((v) => !v)}
                style={{ marginTop: '0.75rem', background: 'none', border: '1px solid var(--bd-faint)', color: 'var(--color-nebula)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', padding: '5px 12px', cursor: 'pointer' }}
              >
                {descExpanded ? '▲ COLLAPSE' : '▼ EXPAND ALL'}
              </button>
            )}
          </div>
        </div>

        {/* Transmissions */}
        <CommentThread subjectType="world" subjectId={world.id} subjectTitle={displayName} posthogEvent="world_comment_sent" allowImages />
      </div>

      <div className="footer-bar" style={{ marginTop: 'auto', paddingTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>WORLD ARCHIVE v2.6</div>
      </div>
    </div>
  )
}
