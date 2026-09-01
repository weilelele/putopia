'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getWorldById, rescanWorld } from '@/lib/actions/worlds'
import { getWorldInvestigation, setWorldVoteScope } from '@/lib/actions/signal-tasks'
import type { WorldInvestigationData } from '@/lib/actions/signal-tasks'
import type { World, WorldVoteScope } from '@/types/database'
import posthog from 'posthog-js'
import { useAuth } from '@/lib/auth-context'
import { CommentThread } from '@/components/comment-thread'
import { InvestigationCard } from '@/app/signal/SignalFeed'
import { LazyImage } from '@/components/lazy-image'
import { WorldScanHero } from '@/components/world-scan-hero'
import { ArchiveReelView } from '@/components/archive-reel'
import { worldScanState, scanComplete } from '@/lib/signal/scan'
import { resolveWorldScan } from '@/lib/signal/scan-resolve'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { ArchiveRouteError, ArchiveRouteLoading } from '@/components/archive-route-state'

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
  const [loadError, setLoadError] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [scope, setScope] = useState<WorldVoteScope>('all')
  const [scopeSaving, setScopeSaving] = useState(false)
  // Failed-scan retry: revise field notes and re-roll the scan window.
  const [retryOpen, setRetryOpen] = useState(false)
  const [retryDesc, setRetryDesc] = useState('')
  const [retrySaving, setRetrySaving] = useState(false)

  const loadWorld = useCallback(async () => {
    await Promise.resolve()
    setWorld(undefined)
    setLoadError(false)
    try {
      const [w, investigation] = await Promise.all([
        getWorldById(id),
        getWorldInvestigation(id).catch(() => null),
      ])
      setWorld(w ?? null)
      setInv(investigation)
      if (w) {
        setScope(w.vote_scope ?? 'all')
        posthog.capture('world_viewed', { world_id: id, world_name: w.name_en || w.name })
        if (w.scan_until && scanComplete(w.scan_until) && !w.scan_resolved_at) {
          resolveWorldScan(id).catch(() => {})
        }
      }
    } catch {
      setLoadError(true)
    }
  }, [id])

  useEffect(() => {
    void Promise.resolve().then(loadWorld)
  }, [loadWorld])

  const isOwner = !!user.id && !!world && (user.id === world.submitted_by || user.id === world.discoverer_id)

  const onScopeChange = async (next: WorldVoteScope) => {
    const prev = scope
    setScope(next)
    setScopeSaving(true)
    const res = await setWorldVoteScope(id, next)
    setScopeSaving(false)
    if (!res.ok) { setScope(prev); return }
    refreshInvestigation()
  }

  const refreshInvestigation = () => getWorldInvestigation(id).then(setInv)
  const refreshAll = () => {
    void loadWorld()
  }

  const openRetry = () => { setRetryDesc(world?.description ?? ''); setRetryOpen(true) }
  const doRescan = async () => {
    setRetrySaving(true)
    const res = await rescanWorld(id, { description: retryDesc })
    setRetrySaving(false)
    if (res.ok) { setRetryOpen(false); refreshAll() }
  }

  if (loadError) {
    return (
      <ArchiveRouteError
        title="WORLD RECORD UNAVAILABLE"
        description="This world record could not be retrieved."
        onRetry={loadWorld}
        returnHref={backHref}
      />
    )
  }

  if (world === undefined) {
    return <ArchiveRouteLoading label="LOADING WORLD RECORD" />
  }

  if (!world) {
    return (
      <div className="main" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', color: 'var(--color-fault)', marginBottom: '1rem' }}>[ 404 ]</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-deep)', marginBottom: '1.5rem' }}>WORLD ENTRY NOT FOUND</div>
        <ArchiveLinkButton href={backHref} variant="ghost">RETURN</ArchiveLinkButton>
      </div>
    )
  }

  const displayName = world.name_en || world.name
  const hasImage = !!world.image_path
  // Signal Scanning gate: while the scan window is open the proposer sees a
  // countdown; when it closes the world is READY (a signal was tuned) or FAILED.
  const scanState = worldScanState(world.scan_until, !!inv?.investigation)
  const scanning = scanState === 'scanning'
  const scanFailed = scanState === 'failed'
  // A world in tuning leads with its Signal Tuning (top slot), not a hero image.
  const investigation = inv?.investigation ?? null
  // Established worlds lead with their Archive reel (final form → days → vision).
  const isEstablished = world.lifecycle_state === 'stable'

  return (
    <main className="main pilot-archive-page archive-detail-page">
      <ArchiveBrandHeader />
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
        <div style={{ marginBottom: '1.5rem', position: 'relative', zIndex: 3 }}>
          {/* Native anchor (not next/link) — a hard navigation that can't be
              swallowed by a failed client/RSC transition (e.g. on SSO-gated previews). */}
          <a href={backHref} className="archive-button archive-button--ghost">{backLabel}</a>
        </div>

        {/* Hero — Signal Scanning countdown / no-signal, else image or gradient */}
        {scanning || scanFailed ? (
          <WorldScanHero
            displayName={displayName}
            gradientFrom={world.gradient_from}
            gradientTo={world.gradient_to}
            scanUntil={world.scan_until}
            variant={scanFailed ? 'failed' : 'scanning'}
            onComplete={refreshAll}
            onRetry={isOwner ? openRetry : undefined}
          />
        ) : isEstablished ? (
          <ArchiveReelView world={world} />
        ) : investigation ? (
          <div style={{ marginBottom: '1.75rem' }}>
            {/* World title — relocated here from the (dropped) hero */}
            <div style={{ marginBottom: '1.1rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--color-star)', lineHeight: 1.2, letterSpacing: '0.02em' }}>{displayName}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.15em', color: 'var(--color-star-deep)', marginTop: 5 }}>{world.id}</div>
            </div>
            {/* Signal Tuning is the lead content — the '// SIGNAL TUNING' label is dropped.
                The vote-lock hint lives in the question footer, not a floating header. */}
            {isOwner && (
              <ArchiveCard className="archive-inline-panel">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', color: 'var(--color-star-deep)' }}>WHO CAN VOTE</span>
                <select value={scope} disabled={scopeSaving} onChange={(e) => onScopeChange(e.target.value as WorldVoteScope)} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.04em', background: 'var(--bg-card)', color: 'var(--color-star)', border: '1px solid rgba(227,82,5,0.3)', padding: '0.3rem 0.5rem', cursor: 'pointer' }}>
                  <option value="all">Open to everyone</option>
                  <option value="voters">Voyagers only</option>
                  <option value="self">Just me (private)</option>
                </select>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.04em', color: 'var(--color-star-deep)' }}>
                  {scopeSaving ? 'Saving…' : 'You can change this anytime.'}
                </span>
              </ArchiveCard>
            )}
            <InvestigationCard investigation={investigation} onFiled={refreshInvestigation} showTitle={false} />
          </div>
        ) : (
        <div style={{ width: '100%', height: '280px', position: 'relative', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid var(--bd-faint)' }}>
          {hasImage ? (
            <>
              {/* gradient placeholder shows until the hero image fades in */}
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${world.gradient_from}, ${world.gradient_to})` }} />
              <LazyImage
                src={world.image_path!}
                alt={displayName}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </>
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
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', background: 'rgba(200,68,6,0.15)', color: 'var(--color-nebula)', padding: '3px 8px', border: '1px solid rgba(200,68,6,0.3)' }}>
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
        )}

        {/* Revise & re-scan — owner only, from the failed state */}
        {scanFailed && isOwner && retryOpen && (
          <ArchiveCard className="archive-rescan-card">
            <ArchiveField htmlFor="world-rescan-notes" label="REVISE FIELD NOTES — THEN RE-SCAN">
              <textarea
                id="world-rescan-notes"
                value={retryDesc}
                onChange={(e) => setRetryDesc(e.target.value)}
                rows={6}
                disabled={retrySaving}
              />
            </ArchiveField>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
              <ArchiveButton
                onClick={doRescan}
                disabled={retrySaving || retryDesc.trim().length < 20}
              >
                {retrySaving ? 'RE-SCANNING…' : 'RE-SCAN'}
              </ArchiveButton>
              <ArchiveButton
                onClick={() => setRetryOpen(false)}
                disabled={retrySaving}
                variant="ghost"
              >
                CANCEL
              </ArchiveButton>
            </div>
          </ArchiveCard>
        )}

        {/* Meta bar */}
        <ArchiveCard className="archive-world-meta">
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
        </ArchiveCard>

        {/* Detail Text — creator's initial vision (collapsible) */}
        <ArchiveCard className="archive-world-notes">
            <ArchiveSectionLabel>FIELD NOTES</ArchiveSectionLabel>
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
              <ArchiveButton
                onClick={() => setDescExpanded((v) => !v)}
                variant="ghost"
              >
                {descExpanded ? '▲ COLLAPSE' : '▼ EXPAND ALL'}
              </ArchiveButton>
            )}
        </ArchiveCard>

        {/* Transmissions */}
        <CommentThread subjectType="world" subjectId={world.id} subjectTitle={displayName} posthogEvent="world_comment_sent" allowImages />
      </div>

      <div className="footer-bar" style={{ marginTop: 'auto', paddingTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>MULTIVERSE COLLECTIVE</div>
      </div>
    </main>
  )
}
