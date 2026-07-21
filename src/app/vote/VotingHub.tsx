'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FilterBar } from '@/components/filter-bar'
import { useAuth } from '@/lib/auth-context'
import { SectionTracker } from '@/components/section-tracker'
import { Plus } from 'lucide-react'
import { VoteCard } from '@/components/VoteCard'
import { CreateVoteModal } from './CreateVoteModal'
import type { Vote } from '@/types/database'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { ArchiveStatStrip } from '@/components/archive-stat-strip'

type Props = {
  votes: Vote[]
  myResponses: { vote_id: string; selected_options: string[] }[]
  tallies: Record<string, Record<string, number>>
}

type FilterTab = 'all' | 'public' | 'classified'

// A vote is "classified" if applicants cannot participate (scope excludes 'applicant')
const isClassified = (v: Vote) => !v.scope.includes('applicant')

// ─── Classified wall ──────────────────────────────────────────────────────────
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

const VOTE_FILTERS = [
  { key: 'all',        label: 'ALL'    },
  { key: 'public',     label: 'PUBLIC' },
  { key: 'classified', label: 'CLASSIFIED' },
]

// ─── Main component ───────────────────────────────────────────────────────────
export function VotingHub({ votes, myResponses, tallies }: Props) {
  const { isAtLeast } = useAuth()
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  // Deep-link support: /vote?tab=classified opens the Classified tab directly
  // (used by the Voyager-pack confirmation email). useSearchParams returns the
  // same value on server and client, so this is hydration-safe.
  const tabParam = useSearchParams().get('tab')
  const [activeFilter, setActiveFilter] = useState<FilterTab>(
    tabParam === 'classified' || tabParam === 'public' ? tabParam : 'all',
  )

  const myResponseMap = Object.fromEntries(myResponses.map((r) => [r.vote_id, r.selected_options]))

  // Filter votes based on active tab
  const filteredVotes =
    activeFilter === 'public'     ? votes.filter(v => !isClassified(v)) :
    activeFilter === 'classified' ? votes.filter(v =>  isClassified(v)) :
    votes

  const activeVotes = filteredVotes.filter((v) => v.is_active)
  const closedVotes = filteredVotes.filter((v) => !v.is_active)

  const showClassifiedWall = activeFilter === 'classified' && !isAtLeast('voyager')

  const handleCreated = () => {
    setShowCreate(false)
    router.refresh()
  }

  return (
    <div className="main pilot-archive-page archive-collection-page archive-vote-page">
      <SectionTracker section="vote" />
      <ArchiveBrandHeader />
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> VOTING HUB</div>
        <div className="right">
          <div className="item">ACTIVE <span className="val">{votes.filter(v => v.is_active).length}</span></div>
          <div className="item">CLOSED <span className="val">{votes.filter(v => !v.is_active).length}</span></div>
        </div>
      </div>

      <ArchivePageHeader
        title="VOTING"
        accent="HUB"
        identity={<ArchiveLinkButton href="/intel" variant="ghost">← INTEL FEED</ArchiveLinkButton>}
        action={isAtLeast('architect') ? (
          <ArchiveButton
            variant="primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={12} />
            CREATE VOTE
          </ArchiveButton>
        ) : undefined}
      />

      <ArchiveStatStrip items={[
        { label: 'ACTIVE', value: votes.filter(v => v.is_active).length, color: 'var(--color-ok)' },
        { label: 'CLOSED', value: votes.filter(v => !v.is_active).length },
        { label: 'TOTAL', value: votes.length },
      ]} />

      <FilterBar
        options={VOTE_FILTERS}
        active={activeFilter}
        onChange={(k) => setActiveFilter(k as FilterTab)}
      />

      {/* Classified wall for non-Voyager */}
      {showClassifiedWall && <ClassifiedWall />}

      {/* Vote lists */}
      {!showClassifiedWall && (
        <>
          {/* Active Votes */}
          {activeVotes.length > 0 && (
            <section className="archive-vote-section">
              <ArchiveSectionLabel>ACTIVE VOTES</ArchiveSectionLabel>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeVotes.map((v) => (
                  <VoteCard
                    key={v.id}
                    vote={v}
                    hasVoted={!!myResponseMap[v.id]}
                    mySelections={myResponseMap[v.id] ?? []}
                    tally={tallies[v.id] ?? {}}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Closed Votes */}
          {closedVotes.length > 0 && (
            <section className="archive-vote-section">
              <ArchiveSectionLabel>CLOSED VOTES</ArchiveSectionLabel>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {closedVotes.map((v) => (
                  <VoteCard
                    key={v.id}
                    vote={v}
                    hasVoted={!!myResponseMap[v.id]}
                    mySelections={myResponseMap[v.id] ?? []}
                    tally={tallies[v.id] ?? {}}
                  />
                ))}
              </div>
            </section>
          )}

          {filteredVotes.length === 0 && (
            <ArchiveCard className="archive-empty-state">
              <h2>NO VOTES FOUND</h2>
              <p>
                No votes match this filter.
              </p>
            </ArchiveCard>
          )}
        </>
      )}

      <div className="footer-bar archive-footer-bar">
        <div className="tag">MULTIVERSE COLLECTIVE</div>
        <div>VOTING HUB</div>
      </div>

      {showCreate && (
        <CreateVoteModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
