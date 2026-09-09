'use client'
import { useSessionPreference } from '@/lib/use-session-preference'

import { MessageSquare, Plus, ArrowRight } from 'lucide-react'
import { getAllIntel } from '@/lib/actions/intel'
import { getCommentCountsBulk } from '@/lib/actions/comments'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { IntelWithAvatar } from '@/types/database'
import { SectionTracker } from '@/components/section-tracker'
import { useAuth } from '@/lib/auth-context'
import { CreateIntelModal } from './CreateIntelModal'
import { FilterBar } from '@/components/filter-bar'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchiveCard } from '@/components/archive-card'
import Link from 'next/link'

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
        href="/voyager-pack"
        variant="primary"
      >
        BECOME A VOYAGER
      </ArchiveLinkButton>
    </ArchiveCard>
  )
}

// ─── Individual Intel card ────────────────────────────────────────────────────
function IntelCard({ entry, commentCount = 0, lead = false }: { entry: IntelWithAvatar; commentCount?: number; lead?: boolean }) {
  const href = `/intel/${entry.id}`
  const metadata = <span className="intel-entry-meta">{entry.tag} · <time dateTime={entry.timestamp}>{formatDate(entry.timestamp)}</time></span>
  if (!lead) return <Link href={href} className="intel-recent-row">
    <div>{metadata}<h3>{entry.title}</h3><span className="intel-comments"><MessageSquare aria-hidden size={14} />{commentCount}</span></div>
    <ArrowRight aria-hidden size={22} />
  </Link>
  return <article className="intel-lead">
    {metadata}<h2>{entry.title}</h2>
    <p className="intel-author">{entry.publisher_name ?? 'Multiverse Collective'}</p>
    <p className="intel-summary">{entry.content}</p>
    <ArchiveLinkButton href={href} variant="primary" fullWidth>READ INTEL <ArrowRight aria-hidden size={20} /></ArchiveLinkButton>
    <Link href={href} className="intel-comments" aria-label={`${commentCount} comments on ${entry.title}`}><MessageSquare aria-hidden size={14} />{commentCount} comments</Link>
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
    <Suspense fallback={null}>
      <IntelPageContent />
    </Suspense>
  )
}

function IntelPageContent() {
  const { isAtLeast } = useAuth()
  const [intel, setIntel] = useState<IntelWithAvatar[]>([])
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  // Deep-link support: /intel?tab=classified opens the Classified tab directly
  // (used by the Voyager-pack confirmation email).
  const tabParam = useSearchParams().get('tab')
  const [activeFilter, setActiveFilter] = useSessionPreference<FilterTab>(`mc:view:intel:${tabParam ?? ''}`,
    tabParam === 'classified' || tabParam === 'public' ? tabParam : 'all',
  )

  const loadIntel = async () => {
    setLoading(true); setLoadError(false)
    try {
      const items = await getAllIntel() as IntelWithAvatar[]
      setIntel(items)
      if (items.length) setCommentCounts(await getCommentCountsBulk('intel', items.map(e => e.id)))
    } catch { setLoadError(true) } finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount; loadIntel() is the shared refetch reused after actions
  useEffect(() => { loadIntel() }, [])

  // Derive displayed list based on filter
  const visibleIntel =
    activeFilter === 'public'     ? intel.filter(e => !e.classified) :
    activeFilter === 'classified' ? intel.filter(e =>  e.classified) :
    intel

  const showClassifiedWall = activeFilter === 'classified' && !isAtLeast('voyager')

  return (
    <div className="main pilot-archive-page archive-collection-page archive-intel-page">
      <SectionTracker section="intel" />



      <h1 className="sr-only">Intel</h1>
      <div className="archive-root-actions"><ArchiveLinkButton href="/vote" variant="ghost">VOTING HUB <ArrowRight aria-hidden size={18} /></ArchiveLinkButton></div>

      <FilterBar
        options={INTEL_FILTERS}
        active={activeFilter}
        onChange={(k) => setActiveFilter(k as FilterTab)}
      />

      <div className="intel-editorial-feed">
        {showClassifiedWall ? <ClassifiedWall /> : <>
          {visibleIntel[0] && <IntelCard lead entry={visibleIntel[0]} commentCount={commentCounts[visibleIntel[0].id] ?? 0} />}
          {visibleIntel.length > 1 && <section aria-labelledby="recent-intel"><h2 id="recent-intel" className="archive-list-heading">RECENT</h2>{visibleIntel.slice(1).map(entry => <IntelCard key={entry.id} entry={entry} commentCount={commentCounts[entry.id] ?? 0} />)}</section>}
          {loading && <p role="status">Loading intel…</p>}
          {loadError && <div role="alert"><p>Intel could not be loaded.</p><ArchiveButton variant="secondary" onClick={loadIntel}>Retry</ArchiveButton></div>}
          {!loading && !loadError && !visibleIntel.length && <p>No intel in this category yet.</p>}
        </>}
      </div>

      <div className="footer-bar archive-footer-bar">
        <div className="tag">MULTIVERSE COLLECTIVE</div>
        <div>LAST UPDATED: {intel[0] ? new Date(intel[0].timestamp).toLocaleDateString() : '—'}</div>
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
          onCreated={() => { setShowCreate(false); loadIntel() }}
          existingItems={intel}
        />
      )}
    </div>
  )
}
