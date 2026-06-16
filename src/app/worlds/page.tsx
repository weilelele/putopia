import Link from 'next/link'
import { getAllWorlds, getPipelineWorlds } from '@/lib/actions/worlds'
import { getTuningCovers } from '@/lib/actions/signal-tasks'
import { SectionTracker } from '@/components/section-tracker'
import type { WorldLifecycle } from '@/types/database'

export const dynamic = 'force-dynamic'

// ─── Icons ────────────────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <line x1="7" y1="12" x2="7" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <polyline points="3,6 7,2 11,6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Lifecycle badge ──────────────────────────────────────────────────────────

function LifecycleBadge({ state }: { state: WorldLifecycle | string }) {
  const config: Record<string, { label: string; color: string }> = {
    proposed: { label: 'UNREVIEWED',  color: 'var(--color-warn)' },
    picked:   { label: 'IN REVIEW',   color: 'var(--color-ok)'   },
    syncing:  { label: 'BUILDING',    color: '#60B0FF'           },
    stable:   { label: 'CONFIRMED',   color: 'var(--color-nucleus)' },
  }
  const c = config[state] ?? config.stable
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em',
      color: c.color, background: `${c.color}18`,
      padding: '2px 6px', border: `1px solid ${c.color}40`,
    }}>
      {c.label}
    </span>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title, subtitle, count, accentColor,
}: { title: string; subtitle?: string; count?: number; accentColor: string }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 3, height: 16, background: accentColor, flexShrink: 0 }} />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
          letterSpacing: '0.22em', color: accentColor, fontWeight: 600,
        }}>
          {title}
        </span>
        {count !== undefined && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em',
            color: accentColor, background: `${accentColor}15`,
            border: `1px solid ${accentColor}35`, padding: '1px 6px',
          }}>
            {count}
          </span>
        )}
        <div style={{ flex: 1, height: '1px', background: `${accentColor}20` }} />
      </div>
      {subtitle && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', color: 'var(--color-star-deep)', marginTop: 4, paddingLeft: 15 }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

// ─── Pipeline card (compact — used for Raw Imagination + World Building) ──────

function PipelineCard({ world, accentColor, cover }: { world: Awaited<ReturnType<typeof getPipelineWorlds>>[number]; accentColor: string; cover?: string }) {
  const displayName = world.name_en || world.name
  // Cover priority (doc 4.2.1): live tuning cover → uploaded world image → gradient
  const coverImg = cover || world.image_path || null
  return (
    <a
      href={`/worlds/${encodeURIComponent(world.id)}`}
      className="pipeline-card"
      style={{
        display: 'block', textDecoration: 'none',
        background: 'var(--bg-panel)',
        border: `1px solid ${accentColor}22`,
        overflow: 'hidden',
        transition: 'border-color 0.2s',
        // CSS custom property for hover color
        ['--card-hover-border' as string]: `${accentColor}55`,
      }}
    >
      {/* Cover — live tuning image / uploaded image, else gradient strip */}
      <div style={{ width: '100%', height: 72, background: `linear-gradient(135deg, ${world.gradient_from}, ${world.gradient_to})`, position: 'relative', overflow: 'hidden' }}>
        {coverImg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)' }} />
        <div style={{ position: 'absolute', top: 7, right: 7 }}>
          <LifecycleBadge state={world.lifecycle_state} />
        </div>
      </div>
      <div style={{ padding: '0.5rem 0.75rem 0.625rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 600, color: 'var(--color-star)', marginBottom: 2, letterSpacing: '0.03em' }}>
          {displayName}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-star-deep)', letterSpacing: '0.04em' }}>
          {world.submitted_at
            ? new Date(world.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—'}
        </div>
      </div>
    </a>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WorldsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>
}) {
  const params = await searchParams
  const submittedName = params.submitted

  const [worlds, pipeline, covers] = await Promise.all([
    getAllWorlds(),
    getPipelineWorlds(),
    getTuningCovers(),
  ])

  // Split pipeline by lifecycle tier (3-stage model)
  const rawImagination = pipeline.filter((w) => w.lifecycle_state === 'proposed')
  const worldBuilding  = pipeline.filter((w) => w.lifecycle_state === 'picked' || w.lifecycle_state === 'syncing')

  return (
    <div className="main">
      <style>{`
        .pipeline-card:hover { border-color: var(--card-hover-border) !important; }
        .world-archive-card:hover { border-color: rgba(255,107,53,0.4) !important; }
        .world-archive-card:hover .world-archive-img { transform: scale(1.04); }
        .world-archive-img { transition: transform 0.5s; }
      `}</style>
      <SectionTracker section="worlds" />

      {/* ── Top bar ── */}
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> WORLD RECORDS</div>
        <div className="right">
          <div className="item">CONFIRMED <span className="val">{worlds.length}</span></div>
          {pipeline.length > 0 && (
            <div className="item">PIPELINE <span className="val">{pipeline.length}</span></div>
          )}
        </div>
      </div>

      {/* ── Success banner ── */}
      {submittedName && (
        <div style={{
          padding: '0.875rem 1.25rem', marginBottom: '1.5rem',
          border: '1px solid rgba(32,216,144,0.28)',
          background: 'rgba(32,216,144,0.05)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{ color: 'var(--color-ok)', fontSize: '1rem', flexShrink: 0 }}>✓</span>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-ok)', letterSpacing: '0.15em', marginBottom: '0.125rem' }}>
              SIGHTING FILED
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-star-dim)', letterSpacing: '0.04em' }}>
              &ldquo;{decodeURIComponent(submittedName)}&rdquo; has entered the pipeline for Architect review.
            </div>
          </div>
        </div>
      )}

      {/* ── Page head ── */}
      <div className="page-head">
        <div>
          <div className="h-eyebrow">{'// ARCHIVE'}</div>
          <h1>WORLD <span className="accent">RECORDS</span></h1>
          <p className="sub">{worlds.length} confirmed parallel worlds</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignSelf: 'flex-start', marginTop: '0.25rem', flexWrap: 'wrap' }}>
          <Link
            href="/signal"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1.25rem', textDecoration: 'none',
              background: 'transparent',
              border: '1px solid rgba(232,93,4,0.45)',
              color: 'var(--color-nebula)',
              fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
              fontWeight: 700, letterSpacing: '0.15em',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="9" cy="9" r="1" fill="currentColor" />
            </svg>
            SIGNAL DISPATCH
          </Link>
          <Link
            href="/worlds/submit"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1.25rem', textDecoration: 'none',
              background: 'linear-gradient(135deg, var(--color-burnt), var(--color-nucleus-3))',
              border: '1px solid rgba(232,93,4,0.45)',
              color: 'var(--color-star)',
              fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
              fontWeight: 700, letterSpacing: '0.15em',
            }}
          >
            <UploadIcon />
            REPORT A SIGHTING
          </Link>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{
        display: 'flex', gap: '2rem', marginBottom: '2rem', padding: '0.875rem 1rem',
        flexWrap: 'wrap', background: 'var(--bg-card)',
        border: '1px solid rgba(255,107,53,0.12)',
        boxShadow: 'inset 0 1px 0 rgba(232,93,4,0.04)',
      }}>
        {[
          { val: rawImagination.length, label: 'INITIAL VISION', color: 'var(--color-warn)' },
          { val: worldBuilding.length,  label: 'SIGNAL TUNING',  color: 'var(--color-ok)'  },
          { val: worlds.length,   label: 'ESTABLISHED',   color: 'var(--color-nucleus)' },
        ].map(({ val, label, color }) => (
          <div key={label}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-star-deep)', letterSpacing: '0.12em', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── INITIAL VISION — proposed worlds (Stage 1) ── */}
      {rawImagination.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <SectionHeader
            title="INITIAL VISION"
            count={rawImagination.length}
            accentColor="var(--color-warn)"
          />
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {rawImagination.map((world) => (
              <PipelineCard key={world.id} world={world} accentColor="#E8A020" />
            ))}
          </div>
        </section>
      )}

      {/* ── SIGNAL TUNING — picked / syncing (Stage 2) ── */}
      {worldBuilding.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <SectionHeader
            title="SIGNAL TUNING"
            count={worldBuilding.length}
            accentColor="var(--color-ok)"
          />
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {worldBuilding.map((world) => (
              <PipelineCard key={world.id} world={world} accentColor="#20D890" cover={covers[world.id]} />
            ))}
          </div>
        </section>
      )}

      {/* ── ESTABLISHED WORLDS — stable (Stage 3) ── */}
      <section>
        <SectionHeader
          title="ESTABLISHED WORLD"
          count={worlds.length}
          accentColor="var(--color-nucleus)"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {worlds.map((world) => {
            const hasImage  = !!world.image_path
            const displayName = world.name_en || world.name

            return (
              <a
                key={world.id}
                href={`/worlds/${encodeURIComponent(world.id)}`}
                className="world-archive-card"
                style={{
                  display: 'block', textDecoration: 'none',
                  background: 'var(--bg-card)',
                  border: '1px solid rgba(255,107,53,0.16)',
                  boxShadow: 'inset 0 1px 0 rgba(232,93,4,0.04)',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Hero */}
                <div className="h-52 relative overflow-hidden">
                  {hasImage ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={world.image_path!}
                        alt={world.name}
                        className="w-full h-full object-cover world-archive-img"
                        style={{ transition: 'transform 0.5s' }}
                      />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(17,21,37,0.9) 100%)' }} />
                    </>
                  ) : (
                    <>
                      <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${world.gradient_from}, ${world.gradient_to})` }} />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(17,21,37,0.85) 100%)' }} />
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)' }} />
                    </>
                  )}
                  <div className="absolute top-2 left-2">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', background: 'rgba(7,9,18,0.72)', color: 'var(--color-star-deep)', padding: '2px 7px', border: '1px solid var(--bd-faint)' }}>
                      {world.id}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: '0.75rem' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', fontWeight: 600, color: 'var(--color-star)', marginBottom: 4, letterSpacing: '0.02em' }}>
                    {displayName}
                  </div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.6, color: 'var(--color-star-dim)', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {world.description}
                  </p>
                  <div style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255,107,53,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      {world.discoverer_id ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-star-dim)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {world.discoverer_name}
                        </span>
                      ) : world.discoverer_name ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-star-dim)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {world.discoverer_name}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-star-deep)', flexShrink: 0 }}>
                      {world.discovery_date}
                    </div>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      </section>

      <div className="footer-bar" style={{ marginTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>WORLD ARCHIVE v3.0</div>
      </div>
    </div>
  )
}
