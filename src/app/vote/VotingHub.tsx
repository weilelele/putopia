'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { SectionTracker } from '@/components/section-tracker'
import { Plus } from 'lucide-react'
import { VoteCard } from '@/components/VoteCard'
import { CreateVoteModal } from './CreateVoteModal'
import type { Vote } from '@/types/database'

type Props = {
  votes: Vote[]
  myResponses: { vote_id: string; selected_options: string[] }[]
  tallies: Record<string, Record<string, number>>
}

export function VotingHub({ votes, myResponses, tallies }: Props) {
  const { isAtLeast } = useAuth()
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)

  const myResponseMap = Object.fromEntries(myResponses.map((r) => [r.vote_id, r.selected_options]))

  const activeVotes = votes.filter((v) => v.is_active)
  const closedVotes = votes.filter((v) => !v.is_active)

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
          <div className="item">ACTIVE <span className="val">{activeVotes.length}</span></div>
          <div className="item">CLOSED <span className="val">{closedVotes.length}</span></div>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="h-eyebrow">// DECISION ZONE</div>
          <h1>VOTING <span className="accent">HUB</span></h1>
          <p className="sub">{activeVotes.length} active / {closedVotes.length} closed</p>
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

      {votes.length === 0 && (
        <div className="text-center py-16">
          <div className="text-xs font-mono tracking-widest mb-2" style={{ color: 'rgba(245,245,245,0.35)' }}>
            // NO VOTES FOUND
          </div>
          <p className="text-xs font-mono" style={{ color: 'rgba(245,245,245,0.35)' }}>
            No votes have been created yet.
          </p>
        </div>
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
