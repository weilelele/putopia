import Link from 'next/link'
import { getAllWorlds, getPipelineWorlds } from '@/lib/actions/worlds'
import { getTuningCovers } from '@/lib/actions/signal-tasks'
import { SectionTracker } from '@/components/section-tracker'
import { WorldPoster } from '@/components/world-poster'
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
      fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em',
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
            fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em',
            color: accentColor, background: `${accentColor}15`,
            border: `1px solid ${accentColor}35`, padding: '1px 6px',
          }}>
            {count}
          </span>
        )}
        <div style={{ flex: 1, height: '1px', background: `${accentColor}20` }} />
      </div>
      {subtitle && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', color: 'var(--color-star-deep)', marginTop: 4, paddingLeft: 15 }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

function formatSubmitted(submitted_at: string | null) {
  return submitted_at
    ? new Date(submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
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
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)', letterSpacing: '0.04em' }}>
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
              padding: '0.5rem 0.75rem', textDecoration: 'none',
              background: 'transparent',
              border: '1px solid rgba(255,107,53,0.4)',
              color: 'rgba(255,107,53,0.85)',
              fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
              letterSpacing: '0.1em', borderRadius: 8, whiteSpace: 'nowrap',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
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
              padding: '0.5rem 0.75rem', textDecoration: 'none',
              background: 'rgba(232,93,4,0.08)',
              border: '1px solid var(--color-nucleus)',
              color: 'var(--color-nucleus)',
              fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
              letterSpacing: '0.1em', borderRadius: 8, whiteSpace: 'nowrap',
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
          { val: rawImagination.length, label: 'INITIAL VISION', color: 'var(--color-warn)',    anchor: '#section-initial-vision' },
          { val: worldBuilding.length,  label: 'SIGNAL TUNING',  color: 'var(--color-ok)',      anchor: '#section-signal-tuning'  },
          { val: worlds.length,         label: 'ESTABLISHED',    color: 'var(--color-nucleus)', anchor: '#section-established'    },
        ].map(({ val, label, color, anchor }) => (
          <a key={label} href={anchor} style={{ textDecoration: 'none', cursor: 'pointer' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', letterSpacing: '0.12em', marginTop: 3 }}>{label}</div>
          </a>
        ))}
      </div>

      {/* ── INITIAL VISION — proposed worlds (Stage 1) ── */}
      {rawImagination.length > 0 && (
        <section id="section-initial-vision" style={{ marginBottom: '2rem' }}>
          <SectionHeader
            title="INITIAL VISION"
            count={rawImagination.length}
            accentColor="var(--color-warn)"
          />
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {rawImagination.map((world) => (
              <WorldPoster
                key={world.id}
                world={world}
                eyebrow="◌ INITIAL VISION"
                date={formatSubmitted(world.submitted_at)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── SIGNAL TUNING — picked / syncing (Stage 2) ── */}
      {worldBuilding.length > 0 && (
        <section id="section-signal-tuning" style={{ marginBottom: '2rem' }}>
          <SectionHeader
            title="SIGNAL TUNING"
            count={worldBuilding.length}
            accentColor="var(--color-ok)"
          />
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {worldBuilding.map((world) => (
              <WorldPoster
                key={world.id}
                world={world}
                cover={covers[world.id]}
                eyebrow={world.id}
                date={formatSubmitted(world.submitted_at)}
                badge={<LifecycleBadge state={world.lifecycle_state} />}
                hoverBorder="rgba(32,216,144,0.5)"
              />
            ))}
          </div>
        </section>
      )}

      {/* ── ESTABLISHED WORLDS — stable (Stage 3) ── */}
      <section id="section-established">
        <SectionHeader
          title="ESTABLISHED WORLD"
          count={worlds.length}
          accentColor="var(--color-nucleus)"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {worlds.map((world) => (
            <WorldPoster
              key={world.id}
              world={world}
              eyebrow={world.id}
              date={world.discovery_date}
              minHeight={232}
              hoverBorder="rgba(255,107,53,0.45)"
              orangeMask
            />
          ))}
        </div>
      </section>

      <div className="footer-bar" style={{ marginTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>WORLD ARCHIVE v3.0</div>
      </div>
    </div>
  )
}
