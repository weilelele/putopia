import Link from 'next/link'
import { Suspense, cache } from 'react'
import { getAllWorlds, getPipelineWorlds } from '@/lib/actions/worlds'
import { getTuningCovers, getTuningActivity } from '@/lib/actions/signal-tasks'
import { SectionTracker } from '@/components/section-tracker'
import { WorldPoster } from '@/components/world-poster'
import { CollapsibleWorldGrid } from '@/components/collapsible-world-grid'

export const dynamic = 'force-dynamic'

// Per-request memoised loaders, so sections that share a query don't re-run it
// (React.cache dedupes within a single render). Each section awaits only what it
// needs and streams in independently via <Suspense>, so the slow Signal Tuning
// covers can't block — or blank — the rest of the page.
const loadWorlds = cache(getAllWorlds)
const loadPipeline = cache(getPipelineWorlds)
const loadCovers = cache(getTuningCovers)
const loadActivity = cache(getTuningActivity)

// Bound a slow loader so a degraded query never hangs its section indefinitely.
async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <line x1="7" y1="12" x2="7" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <polyline points="3,6 7,2 11,6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title, subtitle, accentColor,
}: { title: string; subtitle?: string; accentColor: string }) {
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

// ─── Skeletons (Suspense fallbacks) ─────────────────────────────────────────────

function StatsBarSkeleton() {
  return (
    <div style={{
      display: 'flex', gap: '0.75rem', marginBottom: '2rem', padding: '0.875rem 1rem',
      justifyContent: 'space-between', background: 'var(--bg-card)',
      border: '1px solid rgba(227,82,5,0.12)',
      boxShadow: 'inset 0 1px 0 rgba(200,68,6,0.04)',
    }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          <div className="wr-skeleton" style={{ width: 28, height: 18, borderRadius: 4, background: 'rgba(227,82,5,0.12)' }} />
          <div className="wr-skeleton" style={{ width: 64, height: 10, borderRadius: 4, background: 'rgba(227,82,5,0.10)' }} />
        </div>
      ))}
    </div>
  )
}

function SectionSkeleton({
  title, accentColor, gridClass, count = 8,
}: { title: string; accentColor: string; gridClass: string; count?: number }) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <SectionHeader title={title} accentColor={accentColor} />
      <div className={gridClass}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="wr-skeleton" style={{ aspectRatio: '3 / 4', borderRadius: 8, background: 'rgba(227,82,5,0.07)' }} />
        ))}
      </div>
    </section>
  )
}

// ─── Streamed sections ──────────────────────────────────────────────────────────

async function TopBarCounts() {
  const [worlds, pipeline] = await Promise.all([loadWorlds(), loadPipeline()])
  return (
    <div className="right">
      <div className="item">CONFIRMED <span className="val">{worlds.length}</span></div>
      {pipeline.length > 0 && (
        <div className="item">PIPELINE <span className="val">{pipeline.length}</span></div>
      )}
    </div>
  )
}

async function StatsBar() {
  const [worlds, pipeline] = await Promise.all([loadWorlds(), loadPipeline()])
  const initial = pipeline.filter((w) => w.lifecycle_state === 'proposed').length
  const tuning = pipeline.filter((w) => w.lifecycle_state === 'picked' || w.lifecycle_state === 'syncing').length
  return (
    <div style={{
      display: 'flex', gap: '0.75rem', marginBottom: '2rem', padding: '0.875rem 1rem',
      justifyContent: 'space-between', background: 'var(--bg-card)',
      border: '1px solid rgba(227,82,5,0.12)',
      boxShadow: 'inset 0 1px 0 rgba(200,68,6,0.04)',
    }}>
      {[
        { val: initial,       label: 'INITIAL',     color: 'var(--color-warn)',    anchor: '#section-initial-vision' },
        { val: tuning,        label: 'TUNING',      color: 'var(--color-ok)',      anchor: '#section-signal-tuning'  },
        { val: worlds.length, label: 'ESTABLISHED', color: 'var(--color-nucleus)', anchor: '#section-established'    },
      ].map(({ val, label, color, anchor }) => (
        <a key={label} href={anchor} style={{ textDecoration: 'none', cursor: 'pointer', minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', letterSpacing: '0.1em', marginTop: 3, whiteSpace: 'nowrap' }}>{label}</div>
        </a>
      ))}
    </div>
  )
}

async function InitialVisionSection() {
  const pipeline = await loadPipeline()
  const rawImagination = pipeline.filter((w) => w.lifecycle_state === 'proposed')
  if (!rawImagination.length) return null
  return (
    <section id="section-initial-vision" style={{ marginBottom: '2rem' }}>
      <SectionHeader title="INITIAL VISION" accentColor="var(--color-warn)" />
      <CollapsibleWorldGrid worlds={rawImagination} />
    </section>
  )
}

async function SignalTuningSection() {
  // Covers come from a heavy per-thread query loop; bound it so this section
  // degrades to posters-without-covers rather than hanging if it gets slow.
  const [pipeline, covers, tuningActivity] = await Promise.all([
    loadPipeline(),
    withTimeout(loadCovers(), 8000, {} as Record<string, string>),
    withTimeout(loadActivity(), 5000, {} as Record<string, string>),
  ])
  const worldBuilding = pipeline
    .filter((w) => w.lifecycle_state === 'picked' || w.lifecycle_state === 'syncing')
    // Newest puzzle first — most recently tuned worlds float to the top.
    .sort((a, b) => (tuningActivity[b.id] ?? b.submitted_at ?? '').localeCompare(tuningActivity[a.id] ?? a.submitted_at ?? ''))
  if (!worldBuilding.length) return null
  return (
    <section id="section-signal-tuning" style={{ marginBottom: '2rem' }}>
      <SectionHeader title="SIGNAL TUNING" accentColor="var(--color-ok)" />
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {worldBuilding.map((world) => (
          <WorldPoster
            key={world.id}
            world={world}
            cover={covers[world.id]}
            date={formatSubmitted(world.submitted_at)}
            hideDescription
            hoverBorder="rgba(32,216,144,0.5)"
          />
        ))}
      </div>
    </section>
  )
}

async function EstablishedSection() {
  const worlds = await loadWorlds()
  return (
    <section id="section-established">
      <SectionHeader title="ESTABLISHED WORLD" accentColor="var(--color-nucleus)" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {worlds.map((world) => (
          <WorldPoster
            key={world.id}
            world={world}
            eyebrow={world.id}
            date={world.discovery_date}
            minHeight={232}
            hoverBorder="rgba(227,82,5,0.45)"
            orangeMask
          />
        ))}
      </div>
    </section>
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

  // The shell renders immediately; every data-backed block below streams in
  // top-down via its own <Suspense>, so the page fills progressively and stays
  // responsive as it grows heavier.
  return (
    <div className="main">
      <SectionTracker section="worlds" />
      <style>{`@keyframes wrPulse{0%,100%{opacity:.45}50%{opacity:.85}}.wr-skeleton{animation:wrPulse 1.2s ease-in-out infinite}`}</style>

      {/* ── Top bar ── */}
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> WORLD RECORDS</div>
        <Suspense fallback={<div className="right" />}>
          <TopBarCounts />
        </Suspense>
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
          <h1>WORLD <span className="accent">RECORDS</span></h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignSelf: 'flex-start', marginTop: '0.25rem', flexWrap: 'wrap' }}>
          <Link
            href="/signal"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem', textDecoration: 'none',
              background: 'transparent',
              border: '1px solid rgba(227,82,5,0.4)',
              color: 'rgba(227,82,5,0.85)',
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
              background: 'rgba(200,68,6,0.08)',
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

      {/* ── Stats bar — streams in (fast Postgres counts) ── */}
      <Suspense fallback={<StatsBarSkeleton />}>
        <StatsBar />
      </Suspense>

      {/* ── INITIAL VISION — proposed worlds (Stage 1) ── */}
      <Suspense fallback={<SectionSkeleton title="INITIAL VISION" accentColor="var(--color-warn)" gridClass="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" count={4} />}>
        <InitialVisionSection />
      </Suspense>

      {/* ── SIGNAL TUNING — picked / syncing (Stage 2), heaviest section ── */}
      <Suspense fallback={<SectionSkeleton title="SIGNAL TUNING" accentColor="var(--color-ok)" gridClass="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" count={4} />}>
        <SignalTuningSection />
      </Suspense>

      {/* ── ESTABLISHED WORLDS — stable (Stage 3) ── */}
      <Suspense fallback={<SectionSkeleton title="ESTABLISHED WORLD" accentColor="var(--color-nucleus)" gridClass="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" count={8} />}>
        <EstablishedSection />
      </Suspense>

      <div className="footer-bar" style={{ marginTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>WORLD ARCHIVE v3.0</div>
      </div>
    </div>
  )
}
