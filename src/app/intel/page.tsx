'use client'
import { RootBrandHeader } from '@/components/root-brand-header'
import { PublisherIdentity, NewsMedia } from '@/components/news-content'
import { useSessionPreference } from '@/lib/use-session-preference'

import { MessageSquare, Plus, ArrowRight } from 'lucide-react'
import { getAllIntel } from '@/lib/actions/intel'
import { getCommentCountsBulk } from '@/lib/actions/comments'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { IntelWithAvatar } from '@/types/database'
import { SectionTracker } from '@/components/section-tracker'
import { useAuth } from '@/lib/auth-context'
import dynamic from 'next/dynamic'
import { intelListCache, intelCommentCache, invalidateIntelClientCache } from '@/lib/intel-client-cache'
const CreateIntelModal = dynamic(() => import('./CreateIntelModal').then(module => module.CreateIntelModal))
import { FilterBar } from '@/components/filter-bar'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchiveCard } from '@/components/archive-card'
import Link from 'next/link'
import { PrimaryTabLoading } from '@/components/primary-tab-loading'
import { NoticeStatus } from '@/components/notice-status'

type FilterTab = 'all' | 'public' | 'classified'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

// ─── Classified wall — shown when non-Voyager selects the classified filter ───
function ClassifiedWall() {
  return (
    <ArchiveCard className="archive-access-card">
      <h2>ACCESS RESTRICTED</h2>
      <p>
        This content is classified. Access restricted to Voyager and above.
      </p>
      <ArchiveLinkButton
        href="/voyager-initiation"
        variant="primary"
      >
        BECOME A VOYAGER
      </ArchiveLinkButton>
    </ArchiveCard>
  )
}

// ─── Individual Intel card ────────────────────────────────────────────────────
function IntelCard({ entry, commentCount, lead = false }: { entry: IntelWithAvatar; commentCount?: number; lead?: boolean }) {
  const href = `/intel/${entry.id}`
  const metadata = <span className="intel-entry-meta">{entry.tag} · <time dateTime={entry.timestamp}>{formatDate(entry.timestamp)}</time></span>
  if (!lead) return <article className={`intel-recent-story${entry.images?.length ? " intel-recent-story--media" : ""}`}>
    <Link href={href} className="intel-recent-row"><div>{metadata}<h3>{entry.title}</h3></div><ArrowRight aria-hidden size={22} /></Link>
    <PublisherIdentity name={entry.publisher_name ?? 'Multiverse Collective'} avatar={entry.publisher_avatar_url} />
    <NoticeStatus entry={entry} />
    {!!entry.images?.length && <Link href={href} className="intel-story-media" aria-label={`Open images: ${entry.title}`}><NewsMedia images={entry.images.slice(0,1)} title={entry.title} /></Link>}
    <Link href={href} className="intel-comments"><MessageSquare aria-hidden size={14} />{commentCount === undefined ? 'Comments' : `${commentCount} comments`}</Link>
  </article>
  return <article className="intel-lead">
    {metadata}<h2>{entry.title}</h2>
    <NoticeStatus entry={entry} />
    <PublisherIdentity name={entry.publisher_name ?? 'Multiverse Collective'} avatar={entry.publisher_avatar_url} />
    <p className="intel-summary">{entry.content}</p>
    {!!entry.images?.length && <Link href={href} className="intel-story-media" aria-label={`Open images: ${entry.title}`}><NewsMedia images={entry.images} title={entry.title} /></Link>}
    <ArchiveLinkButton href={href} variant="primary" fullWidth>READ INTEL <ArrowRight aria-hidden size={20} /></ArchiveLinkButton>
    <Link href={href} className="intel-comments" aria-label={`${commentCount === undefined ? 'Comments' : `${commentCount} comments`} on ${entry.title}`}><MessageSquare aria-hidden size={14} />{commentCount === undefined ? 'Comments' : `${commentCount} comments`}</Link>
  </article>
}

const INTEL_FILTERS = [
  { key: 'all',        label: 'ALL'    },
  { key: 'public',     label: 'PUBLIC' },
  { key: 'classified', label: 'CLASSIFIED' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function IntelPage() {
  return (
    <Suspense fallback={<PrimaryTabLoading kind="collection" />}>
      <IntelPageContent />
    </Suspense>
  )
}

function IntelPageContent() {
  const { user, accessRole, loading } = useAuth()
  if (loading) return <PrimaryTabLoading kind="collection" />
  const scope = `${user.id ?? 'guest'}:${user.role}:${accessRole}`
  return <IntelPageData key={scope} scope={scope} />
}

function IntelPageData({ scope }: { scope: string }) {
  const { isAtLeast } = useAuth()
  const cache = intelListCache.forKey(scope)
  const countsCache = intelCommentCache.forKey(scope)
  const [intel, setIntel] = useState<IntelWithAvatar[]>(() => cache.peek() ?? [])
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(() => countsCache.peek() ?? {})
  const [loading, setLoading] = useState(() => cache.peek() === undefined)
  const [loadError, setLoadError] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  // Deep-link support: /intel?tab=classified opens the Classified tab directly
  // (used by the Voyager-pack confirmation email).
  const tabParam = useSearchParams().get('tab')
  const [activeFilter, setActiveFilter] = useSessionPreference<FilterTab>(`mc:view:intel:${tabParam ?? ''}`,
    tabParam === 'classified' || tabParam === 'public' ? tabParam : 'all',
  )

  const requestVersion = useRef(0)
  const countsVersion = useRef(0)
  const [countsError, setCountsError] = useState(false)
  const loadCounts = useCallback(async (items: IntelWithAvatar[], force = false) => {
    const version = ++countsVersion.current
    try {
      const counts = await countsCache.load(async () => {
        if (!items.length) return {}
        const counts = await getCommentCountsBulk('intel', items.map(entry => entry.id))
        return Object.fromEntries(items.map(entry => [entry.id, counts[entry.id] ?? 0]))
      }, force)
      if (version !== countsVersion.current) return
      setCommentCounts(counts)
      setCountsError(false)
    } catch { if (version === countsVersion.current) setCountsError(true) }
  }, [countsCache])

  const loadIntel = useCallback(async (force = false) => {
    const version = ++requestVersion.current
    setLoadError(false)
    try {
      const items = await cache.load(getAllIntel, force)
      if (version !== requestVersion.current) return
      setIntel(items)
      setLoading(false)
      // Secondary counts must not hold the article list behind another roundtrip.
      await loadCounts(items, force)
    } catch { if (version === requestVersion.current) setLoadError(true) }
    finally { if (version === requestVersion.current) setLoading(false) }
  }, [cache, loadCounts])

  useEffect(() => {
    let cancelled = false
    const version = ++requestVersion.current
    cache.load(getAllIntel).then(items => {
      if (cancelled || version !== requestVersion.current) return
      setIntel(items)
      setLoading(false)
      void loadCounts(items)
    }).catch(() => { if (!cancelled && version === requestVersion.current) setLoadError(true) })
      .finally(() => { if (!cancelled && version === requestVersion.current) setLoading(false) })
    return () => { cancelled = true }
  }, [cache, loadCounts])

  // Derive displayed list based on filter
  const visibleIntel =
    activeFilter === 'public'     ? intel.filter(e => !e.classified) :
    activeFilter === 'classified' ? intel.filter(e =>  e.classified) :
    intel

  const showClassifiedWall = activeFilter === 'classified' && !isAtLeast('voyager')

  if (loading) return <PrimaryTabLoading kind="collection" />

  return (
    <div className="main pilot-archive-page archive-collection-page archive-intel-page" data-route-scroll>
      <SectionTracker section="intel" />



      <h1 className="sr-only">Intel</h1>
      <RootBrandHeader><ArchiveLinkButton href="/vote" variant="ghost">VOTING HUB <ArrowRight aria-hidden size={18} /></ArchiveLinkButton></RootBrandHeader>

      <FilterBar
        options={INTEL_FILTERS}
        active={activeFilter}
        onChange={(k) => setActiveFilter(k as FilterTab)}
      />

      <div className="intel-editorial-feed">
        {showClassifiedWall ? <ClassifiedWall /> : <>
          {visibleIntel[0] && <IntelCard lead entry={visibleIntel[0]} commentCount={commentCounts[visibleIntel[0].id]} />}
          {visibleIntel.length > 1 && <section aria-labelledby="recent-intel"><h2 id="recent-intel" className="archive-list-heading">RECENT</h2>{visibleIntel.slice(1).map(entry => <IntelCard key={entry.id} entry={entry} commentCount={commentCounts[entry.id]} />)}</section>}
          {countsError && <div role="status"><p>Comment counts are unavailable.</p><ArchiveButton variant="ghost" onClick={() => void loadCounts(intel, true)}>Retry counts</ArchiveButton></div>}
          {loadError && <div role="alert"><p>Intel could not be loaded.</p><ArchiveButton variant="secondary" onClick={() => void loadIntel(true)}>Retry</ArchiveButton></div>}
          {!loading && !loadError && !visibleIntel.length && <p>No intel in this category yet.</p>}
        </>}
      </div>


      {isAtLeast('architect') && (
        <ArchiveButton
          className="intel-publish-action"
          variant="primary"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={12} />
          PUBLISH INTEL
        </ArchiveButton>
      )}

      {showCreate && (
        <CreateIntelModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); invalidateIntelClientCache(); void loadIntel(true) }}
          existingItems={intel}
        />
      )}
    </div>
  )
}
