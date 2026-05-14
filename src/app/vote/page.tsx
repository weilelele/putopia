'use client'

import { useState } from 'react'
import { voteData, VoteItem } from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'
import { Plus } from 'lucide-react'
import clsx from 'clsx'

const SCOPE_STYLES = {
  ALL: { color: '#7A6A40', border: '#3D3010', bg: 'transparent' },
  VOYAGER: { color: '#E8A020', border: 'rgba(232,160,32,0.3)', bg: 'rgba(232,160,32,0.1)' },
  ARCHITECT: { color: '#D4601A', border: 'rgba(212,96,26,0.3)', bg: 'rgba(212,96,26,0.1)' },
}

function VoteCard({ vote }: { vote: VoteItem }) {
  const { isAtLeast } = useAuth()
  const [selected, setSelected] = useState<string[]>([])
  const [voted, setVoted] = useState(false)

  const canVote = isAtLeast('voyager') && vote.status === 'active' && !voted
  const scopeStyle = SCOPE_STYLES[vote.scope]

  const toggle = (id: string) => {
    if (!canVote) return
    if (vote.type === 'single') {
      setSelected([id])
    } else {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      )
    }
  }

  const handleVote = () => {
    if (selected.length === 0) return
    setVoted(true)
  }

  const totalVotes = vote.options.reduce((s, o) => s + o.count, 0)

  return (
    <div
      className="border rounded p-5"
      style={{
        background: '#221800',
        borderColor: vote.status === 'active' ? '#5C4A1E' : '#3D3010',
        opacity: vote.status === 'closed' ? 0.75 : 1,
        boxShadow: vote.status === 'active' ? 'inset 0 1px 0 rgba(232,160,32,0.1)' : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs font-mono px-2 py-0.5 border rounded tracking-widest"
            style={{ color: scopeStyle.color, borderColor: scopeStyle.border, background: scopeStyle.bg }}
          >
            {vote.scope}
          </span>
          <span
            className={clsx('text-xs font-mono px-2 py-0.5 border rounded')}
            style={
              vote.status === 'active'
                ? { color: '#4D8C3F', borderColor: 'rgba(77,140,63,0.3)', background: 'rgba(77,140,63,0.1)' }
                : { color: '#7A6A40', borderColor: '#3D3010', background: 'transparent' }
            }
          >
            {vote.status === 'active' ? '● ACTIVE' : '○ CLOSED'}
          </span>
          <span className="text-xs font-mono" style={{ color: '#5C4A1E' }}>{vote.id}</span>
        </div>
        <div className="text-xs font-mono whitespace-nowrap" style={{ color: '#7A6A40' }}>
          {vote.status === 'active' ? `ends ${vote.endsAt}` : `ended ${vote.endsAt}`}
        </div>
      </div>

      <h2 className="text-base font-mono font-semibold mb-2" style={{ color: '#F5E6C8' }}>
        {vote.title}
      </h2>
      <p className="text-xs font-mono leading-relaxed mb-4" style={{ color: '#C4A96A' }}>
        {vote.description}
      </p>

      <div className="text-xs font-mono mb-3" style={{ color: '#5C4A1E' }}>
        {vote.type === 'single' ? '// SINGLE CHOICE' : '// MULTI CHOICE'} — {totalVotes} votes cast
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {vote.options.map((option) => {
          const isSelected = selected.includes(option.id)
          const pct = totalVotes > 0 ? Math.round((option.count / totalVotes) * 100) : 0
          return (
            <div key={option.id}>
              <button
                onClick={() => toggle(option.id)}
                disabled={!canVote}
                className="w-full text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-sm border shrink-0"
                    style={{
                      borderColor: isSelected ? '#E8A020' : '#3D3010',
                      background: isSelected ? '#E8A020' : 'transparent',
                    }}
                  />
                  <span className="text-xs font-mono" style={{ color: isSelected ? '#F5E6C8' : '#C4A96A' }}>
                    {option.label}
                  </span>
                  <span className="ml-auto text-xs font-mono" style={{ color: '#5C4A1E' }}>
                    {pct}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1 rounded-full ml-5 overflow-hidden" style={{ background: '#3D3010' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: isSelected ? '#E8A020' : '#5C4A1E',
                    }}
                  />
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Submit */}
      {canVote && (
        <button
          onClick={handleVote}
          disabled={selected.length === 0}
          className="px-4 py-1.5 text-xs font-mono tracking-widest border rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ borderColor: '#E8A020', color: '#0F0A00', background: '#E8A020' }}
        >
          [ CAST VOTE ]
        </button>
      )}
      {voted && (
        <div className="text-xs font-mono" style={{ color: '#4D8C3F' }}>
          ✓ VOTE RECORDED
        </div>
      )}
      {vote.status === 'closed' && (
        <div className="text-xs font-mono" style={{ color: '#5C4A1E' }}>
          // VOTING PERIOD CLOSED
        </div>
      )}
      {!isAtLeast('voyager') && vote.status === 'active' && (
        <div className="text-xs font-mono" style={{ color: '#7A6A40' }}>
          // VOYAGER+ ACCESS REQUIRED TO VOTE
        </div>
      )}
    </div>
  )
}

export default function VotePage() {
  const { isAtLeast } = useAuth()

  const activeVotes = voteData.filter((v) => v.status === 'active')
  const closedVotes = voteData.filter((v) => v.status === 'closed')

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#0F0A00' }}>
      {/* Header */}
      <div className="mb-8 border-b pb-4 flex items-end justify-between" style={{ borderColor: '#5C4A1E' }}>
        <div>
          <div className="text-xs tracking-[0.3em] font-mono mb-1" style={{ color: '#7A6A40' }}>
            SYSTEM // VOTE
          </div>
          <h1 className="text-2xl font-mono font-bold tracking-wider" style={{ color: '#F5E6C8' }}>
            VOTE
          </h1>
          <div className="text-xs font-mono mt-1" style={{ color: '#7A6A40' }}>
            Decision Zone // {activeVotes.length} active / {closedVotes.length} closed
          </div>
        </div>
        {isAtLeast('voyager') && (
          <button
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono tracking-widest border rounded transition-all"
            style={{ borderColor: '#E8A020', color: '#E8A020', background: 'rgba(232,160,32,0.08)' }}
          >
            <Plus size={12} />
            CREATE VOTE
          </button>
        )}
      </div>

      {/* Active */}
      {activeVotes.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-xs font-mono tracking-widest" style={{ color: '#4D8C3F' }}>
              ● ACTIVE VOTES
            </div>
            <div className="flex-1 h-px" style={{ background: '#3D3010' }} />
          </div>
          <div className="space-y-4">
            {activeVotes.map((v) => <VoteCard key={v.id} vote={v} />)}
          </div>
        </section>
      )}

      {/* Closed */}
      {closedVotes.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-xs font-mono tracking-widest" style={{ color: '#7A6A40' }}>
              ○ CLOSED VOTES
            </div>
            <div className="flex-1 h-px" style={{ background: '#3D3010' }} />
          </div>
          <div className="space-y-4">
            {closedVotes.map((v) => <VoteCard key={v.id} vote={v} />)}
          </div>
        </section>
      )}
    </div>
  )
}
