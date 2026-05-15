'use client'

import { useState } from 'react'
import { voteData, VoteItem } from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'
import { Plus } from 'lucide-react'
import clsx from 'clsx'

const SCOPE_STYLES = {
  ALL: { color: '#4A5570', border: '#1A2238', bg: 'transparent' },
  VOYAGER: { color: '#E85A00', border: 'rgba(232,90,0,0.3)', bg: 'rgba(232,90,0,0.08)' },
  ARCHITECT: { color: '#00C8C8', border: 'rgba(0,200,200,0.3)', bg: 'rgba(0,200,200,0.08)' },
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
      className="border p-5"
      style={{
        background: '#111525',
        borderColor: vote.status === 'active' ? '#1E2840' : '#1A2238',
        opacity: vote.status === 'closed' ? 0.75 : 1,
        boxShadow: vote.status === 'active' ? 'inset 0 1px 0 rgba(232,90,0,0.05)' : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs font-mono px-2 py-0.5 border tracking-widest"
            style={{ color: scopeStyle.color, borderColor: scopeStyle.border, background: scopeStyle.bg }}
          >
            {vote.scope}
          </span>
          <span
            className={clsx('text-xs font-mono px-2 py-0.5 border')}
            style={
              vote.status === 'active'
                ? { color: '#20D890', borderColor: 'rgba(32,216,144,0.3)', background: 'rgba(32,216,144,0.08)' }
                : { color: '#4A5570', borderColor: '#1A2238', background: 'transparent' }
            }
          >
            {vote.status === 'active' ? '● ACTIVE' : '○ CLOSED'}
          </span>
          <span className="text-xs font-mono" style={{ color: '#4A5570' }}>{vote.id}</span>
        </div>
        <div className="text-xs font-mono whitespace-nowrap" style={{ color: '#4A5570' }}>
          {vote.status === 'active' ? `ends ${vote.endsAt}` : `ended ${vote.endsAt}`}
        </div>
      </div>

      <h2 className="text-base font-mono font-semibold mb-2" style={{ color: '#EDE8DE' }}>
        {vote.title}
      </h2>
      <p className="text-xs font-mono leading-relaxed mb-4" style={{ color: '#8A9AB5' }}>
        {vote.description}
      </p>

      <div className="text-xs font-mono mb-3" style={{ color: '#4A5570' }}>
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
                    className="w-3 h-3 border shrink-0"
                    style={{
                      borderColor: isSelected ? '#E85A00' : '#1A2238',
                      background: isSelected ? '#E85A00' : 'transparent',
                    }}
                  />
                  <span className="text-xs font-mono" style={{ color: isSelected ? '#EDE8DE' : '#8A9AB5' }}>
                    {option.label}
                  </span>
                  <span className="ml-auto text-xs font-mono" style={{ color: '#4A5570' }}>
                    {pct}%
                  </span>
                </div>
                <div className="h-1 ml-5 overflow-hidden" style={{ background: '#1A2238' }}>
                  <div
                    className="h-full"
                    style={{
                      width: `${pct}%`,
                      background: isSelected ? '#E85A00' : '#1E2840',
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
          className="px-4 py-1.5 text-xs font-mono tracking-widest border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ borderColor: '#E85A00', color: '#EDE8DE', background: 'linear-gradient(135deg, #E85A00, #C04000)' }}
        >
          [ CAST VOTE ]
        </button>
      )}
      {voted && (
        <div className="text-xs font-mono" style={{ color: '#20D890' }}>
          ✓ VOTE RECORDED
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
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#070912' }}>
      {/* Header */}
      <div className="mb-8 border-b pb-4 flex items-end justify-between" style={{ borderColor: '#1E2840' }}>
        <div>
          <div className="text-xs tracking-[0.3em] font-mono mb-1" style={{ color: '#4A5570' }}>
            SYSTEM // VOTE
          </div>
          <h1 className="text-2xl font-mono font-bold tracking-wider" style={{ color: '#EDE8DE' }}>
            VOTE
          </h1>
          <div className="text-xs font-mono mt-1" style={{ color: '#4A5570' }}>
            Decision Zone // {activeVotes.length} active / {closedVotes.length} closed
          </div>
        </div>
        {isAtLeast('voyager') && (
          <button
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono tracking-widest border transition-all"
            style={{ borderColor: '#E85A00', color: '#E85A00', background: 'rgba(232,90,0,0.06)' }}
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
            <div className="text-xs font-mono tracking-widest" style={{ color: '#20D890' }}>
              ● ACTIVE VOTES
            </div>
            <div className="flex-1 h-px" style={{ background: '#1A2238' }} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeVotes.map((v) => <VoteCard key={v.id} vote={v} />)}
          </div>
        </section>
      )}

      {/* Closed */}
      {closedVotes.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-xs font-mono tracking-widest" style={{ color: '#4A5570' }}>
              ○ CLOSED VOTES
            </div>
            <div className="flex-1 h-px" style={{ background: '#1A2238' }} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {closedVotes.map((v) => <VoteCard key={v.id} vote={v} />)}
          </div>
        </section>
      )}
    </div>
  )
}
