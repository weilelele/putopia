import { Suspense, cache } from 'react'
import { getAllWorlds, getDiscovererAvatars } from '@/lib/actions/worlds'
import { SectionTracker } from '@/components/section-tracker'
import { WorldFeed } from '@/components/world-feed'
import { getFirstObservers, getWorldReportStats } from '@/lib/actions/world-reports'
import { isFuzzyWorld, isOfficialWorld, worldByline, worldTags } from '@/lib/world-presentation'
import { WorldsSectionTabs } from '@/components/worlds-section-tabs'
import { ArchiveCard } from '@/components/archive-card'
import { RootBrandHeader } from '@/components/root-brand-header'

export const dynamic = 'force-dynamic'

// Per-request memoised loaders, so sections that share a query don't re-run it
// (React.cache dedupes within a single render). Each section awaits only what it
// needs and streams in independently via <Suspense>, so the slow Signal Tuning
// covers can't block — or blank — the rest of the page.
const loadWorlds = cache(getAllWorlds)

// ─── Observe feed: established worlds ─────────────────────────────────────────

async function ObserveFeed() {
  // Newest first (the loader returns oldest first). Phase 1: the newest world
  // stands in as the key world until a real "featured" flag exists.
  const worlds = [...(await loadWorlds())].reverse()
  if (!worlds.length) return <div className="archive-empty-state">NO WORLDS TO OBSERVE YET</div>
  const ids = worlds.map((w) => w.id)
  const [avatars, stats, observers] = await Promise.all([
    getDiscovererAvatars(worlds.map((w) => w.discoverer_id ?? '')).catch(() => ({} as Record<string, string>)),
    getWorldReportStats(ids).catch(() => ({} as Awaited<ReturnType<typeof getWorldReportStats>>)),
    getFirstObservers(ids).catch(() => ({} as Awaited<ReturnType<typeof getFirstObservers>>)),
  ])
  return (
    <WorldFeed
      worlds={worlds.map((w, i) => {
        const observer = observers[w.id] ?? null
        const byline = worldByline(w, observer)
        return {
          id: w.id,
          name: w.name_en || w.name,
          cover: w.image_path,
          byline,
          avatar: isOfficialWorld(w.id) ? observer?.avatar ?? null : byline.profileId ? avatars[byline.profileId] ?? null : null,
          tags: worldTags(w, isFuzzyWorld(w.id, observer)),
          seen: stats[w.id]?.seen ?? 0,
          anomalies: stats[w.id]?.anomalies ?? 0,
          featured: i === 0,
        }
      })}
    />
  )
}

function FeedSkeleton() {
  return (
    <div className="worlds-feed">
      {Array.from({ length: 4 }).map((_, i) => (
        <ArchiveCard key={i} className="wr-skeleton archive-poster-skeleton" />
      ))}
    </div>
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

  return (
    <main className="main pilot-archive-page archive-collection-page worlds-page">
      <SectionTracker section="worlds" />

      <style>{`@keyframes wrPulse{0%,100%{opacity:.45}50%{opacity:.85}}.wr-skeleton{animation:wrPulse 1.2s ease-in-out infinite}`}</style>

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

      <h1 className="sr-only">Worlds</h1>
      <RootBrandHeader />
      <WorldsSectionTabs active="observe" />

      <Suspense fallback={<FeedSkeleton />}>
        <ObserveFeed />
      </Suspense>

    </main>
  )
}
