'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FilterBar } from '@/components/filter-bar'
import { useAuth } from '@/lib/auth-context'
import { SectionTracker } from '@/components/section-tracker'
import { Plus } from 'lucide-react'
import { VoteCard } from '@/components/VoteCard'
import { BackLink } from '@/components/back-link'
import { CreateVoteModal } from './CreateVoteModal'
import type { Vote } from '@/types/database'

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
    <div style={{
      border: '1px solid rgba(255,107,53,0.25)',
      background: 'rgba(232,93,4,0.03)',
      padding: '3.5rem 2rem',
      textAlign: 'center',
      marginTop: '1rem',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
        letterSpacing: '0.25em', color: 'rgba(245,245,245,0.2)',
        marginBottom: '1rem',
      }}>{"// ACCESS RESTRICTED"}</div>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)',
        color: 'rgba(245,245,245,0.5)', lineHeight: 1.8, marginBottom: '1.75rem',
      }}>
        This content is classified. Access restricted to Voyager and above.
      </p>
      <Link
        href="/voyager-pack"
        style={{
          display: 'inline-block',
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
          letterSpacing: '0.18em', color: '#FF6B35',
          border: '1px solid rgba(255,107,53,0.45)',
          padding: '0.5rem 1.75rem', textDecoration: 'none',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,107,53,0.08)')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
      >
        BECOME A VOYAGER →
      </Link>
    </div>
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
    <div className="main">
      <SectionTracker section="vote" />
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> VOTING HUB</div>
        <div className="right">
          <div className="item">ACTIVE <span className="val">{votes.filter(v => v.is_active).length}</span></div>
          <div className="item">CLOSED <span className="val">{votes.filter(v => !v.is_active).length}</span></div>
        </div>
      </div>

      <div className="page-head">
        <div>
          <BackLink href="/intel" label="INTEL FEED" />
          <h1>VOTING <span className="accent">HUB</span></h1>
          <p className="sub">{votes.filter(v => v.is_active).length} active / {votes.filter(v => !v.is_active).length} closed</p>
        </div>
        {isAtLeast('architect') && (
          <button
            className="btn-secondary"
            style={{ padding: '0.55rem 1.25rem', fontSize: 'var(--fs-caption)' }}
            onClick={() => setShowCreate(true)}
          >
            <Plus size={12} />
            CREATE VOTE
          </button>
        )}
      </div>

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
            <section className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-xs font-mono tracking-widest" style={{ color: '#20D890' }}>
                  ● ACTIVE VOTES
                </div>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,107,53,0.16)' }} />
              </div>
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
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-xs font-mono tracking-widest" style={{ color: 'rgba(245,245,245,0.35)' }}>
                  ○ CLOSED VOTES
                </div>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,107,53,0.16)' }} />
              </div>
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
            <div className="text-center py-16">
              <div className="text-xs font-mono tracking-widest mb-2" style={{ color: 'rgba(245,245,245,0.35)' }}>{"// NO VOTES FOUND"}</div>
              <p className="text-xs font-mono" style={{ color: 'rgba(245,245,245,0.35)' }}>
                No votes match this filter.
              </p>
            </div>
          )}
        </>
      )}

      <div className="footer-bar" style={{ marginTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
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
