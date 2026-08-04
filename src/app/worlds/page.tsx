import { Suspense, cache } from 'react'
import Link from 'next/link'
import { ArrowUp } from 'lucide-react'
import { getAllWorlds, getPipelineWorlds } from '@/lib/actions/worlds'
import { getInvestigationFeed, getTuningCovers, getTuningActivity } from '@/lib/actions/signal-tasks'
import { SectionTracker } from '@/components/section-tracker'
import { WorldPoster } from '@/components/world-poster'
import { CollapsibleWorldGrid } from '@/components/collapsible-world-grid'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { ArchiveStatStrip } from '@/components/archive-stat-strip'
import { EmbeddedInvestigationFeed } from '@/app/signal/SignalFeed'

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

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title, subtitle,
}: { title: string; subtitle?: string; accentColor: string }) {
  return (
    <div className="archive-section-heading">
      <ArchiveSectionLabel>{title}</ArchiveSectionLabel>
      {subtitle && (
        <div className="archive-section-heading__subtitle">
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
    <ArchiveStatStrip items={['INITIAL', 'TUNING', 'ESTABLISHED'].map((label) => ({
      label,
      value: <span className="wr-skeleton archive-stat-skeleton" />,
    }))} />
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
          <ArchiveCard key={i} className="wr-skeleton archive-poster-skeleton" />
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
    <ArchiveStatStrip items={[
      { value: initial, label: 'INITIAL', color: 'var(--color-warn)', href: '#section-initial-vision' },
      { value: tuning, label: 'TUNING', color: 'var(--color-ok)', href: '#section-signal-tuning' },
      { value: worlds.length, label: 'ESTABLISHED', color: 'var(--color-nucleus)', href: '#section-established' },
    ]} />
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

async function SignalDispatchSection() {
  const feed = await getInvestigationFeed()
  return <EmbeddedInvestigationFeed initial={feed} />
}

function SignalDispatchSkeleton() {
  return (
    <div className="worlds-dispatch-loading" aria-busy="true">
      Receiving active signals…
    </div>
  )
}

function WorldsViewTabs({ activeView }: { activeView: 'dispatch' | 'records' }) {
  return (
    <nav aria-label="Worlds views" className="worlds-view-tabs">
      <Link
        aria-current={activeView === 'dispatch' ? 'page' : undefined}
        className={`worlds-view-tabs__link${activeView === 'dispatch' ? ' is-active' : ''}`}
        href="/worlds"
        scroll={false}
      >
        Signal Dispatch
      </Link>
      <Link
        aria-current={activeView === 'records' ? 'page' : undefined}
        className={`worlds-view-tabs__link${activeView === 'records' ? ' is-active' : ''}`}
        href="/worlds?view=records"
        scroll={false}
      >
        World Records
      </Link>
    </nav>
  )
}

function WorldRecordsContent() {
  return (
    <>
      <Suspense fallback={<StatsBarSkeleton />}>
        <StatsBar />
      </Suspense>

      <Suspense fallback={<SectionSkeleton title="INITIAL VISION" accentColor="var(--color-warn)" gridClass="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" count={4} />}>
        <InitialVisionSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton title="SIGNAL TUNING" accentColor="var(--color-ok)" gridClass="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" count={4} />}>
        <SignalTuningSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton title="ESTABLISHED WORLD" accentColor="var(--color-nucleus)" gridClass="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" count={8} />}>
        <EstablishedSection />
      </Suspense>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WorldsPage({
  searchParams,
}: {
  searchParams: Promise<{
    submitted?: string | string[]
    view?: string | string[]
  }>
}) {
  const params = await searchParams
  const submittedName = Array.isArray(params.submitted) ? params.submitted[0] : params.submitted
  const requestedView = Array.isArray(params.view) ? params.view[0] : params.view
  const activeView = requestedView === 'records' ? 'records' : 'dispatch'

  // The shell renders immediately; every data-backed block below streams in
  // top-down via its own <Suspense>, so the page fills progressively and stays
  // responsive as it grows heavier.
  return (
    <main className="main pilot-archive-page archive-collection-page">
      <SectionTracker section="worlds" />
      <ArchiveBrandHeader />
      <style>{`@keyframes wrPulse{0%,100%{opacity:.45}50%{opacity:.85}}.wr-skeleton{animation:wrPulse 1.2s ease-in-out infinite}`}</style>

      {/* ── Top bar ── */}
      <div className="top-bar">
        <div className="crumbs">
          PC://CONSOLE <span>/</span> {activeView === 'records' ? 'WORLD RECORDS' : 'SIGNAL DISPATCH'}
        </div>
        {activeView === 'records' && (
          <Suspense fallback={<div className="right" />}>
            <TopBarCounts />
          </Suspense>
        )}
      </div>

      {/* ── Success banner ── */}
      {submittedName && (
        <div className="archive-form-message is-success archive-success-banner">
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
      <ArchivePageHeader
        className="worlds-page-header"
        action={(
          <ArchiveLinkButton className="worlds-report-action" href="/worlds/submit" variant="secondary">
            <ArrowUp aria-hidden="true" size={14} strokeWidth={1.75} />
            <span>REPORT A SIGHTING</span>
          </ArchiveLinkButton>
        )}
        title="WORLDS"
      />

      <WorldsViewTabs activeView={activeView} />

      {activeView === 'dispatch' ? (
        <Suspense fallback={<SignalDispatchSkeleton />}>
          <SignalDispatchSection />
        </Suspense>
      ) : (
        <WorldRecordsContent />
      )}

      <div className="footer-bar" style={{ marginTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>MULTIVERSE COLLECTIVE</div>
      </div>
    </main>
  )
}
