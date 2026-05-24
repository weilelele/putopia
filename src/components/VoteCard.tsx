'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { submitVoteResponse } from '@/lib/actions/votes'
import type { Vote, UserRole } from '@/types/database'
import clsx from 'clsx'

const ROLE_STYLE: Record<UserRole, { color: string; border: string; bg: string }> = {
  guest:     { color: '#4A5570', border: '#1A2238',               bg: 'transparent' },
  applicant: { color: '#8A9AB5', border: 'rgba(138,154,181,0.3)', bg: 'rgba(138,154,181,0.06)' },
  voyager:   { color: '#E85A00', border: 'rgba(232,90,0,0.3)',    bg: 'rgba(232,90,0,0.08)' },
  architect: { color: '#00C8C8', border: 'rgba(0,200,200,0.3)',   bg: 'rgba(0,200,200,0.08)' },
}

const ALL_ROLES: UserRole[] = ['applicant', 'voyager', 'architect']

function ScopeBadges({ scope }: { scope: UserRole[] }) {
  const isAll = ALL_ROLES.every((r) => scope.includes(r))
  if (isAll) {
    return (
      <span
        className="text-xs font-mono px-2 py-0.5 border tracking-widest"
        style={{ color: '#8A9AB5', borderColor: 'rgba(138,154,181,0.3)', background: 'rgba(138,154,181,0.06)' }}
      >
        ALL MEMBERS
      </span>
    )
  }
  const display = scope.filter((r) => r !== 'guest')
  return (
    <>
      {display.map((role) => {
        const s = ROLE_STYLE[role]
        return (
          <span
            key={role}
            className="text-xs font-mono px-2 py-0.5 border tracking-widest"
            style={{ color: s.color, borderColor: s.border, background: s.bg }}
          >
            {role.toUpperCase()}
          </span>
        )
      })}
    </>
  )
}

type Props = {
  vote: Vote
  hasVoted: boolean
  mySelections: string[]
  tally: Record<string, number>
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function VoteCard({ vote, hasVoted: initialHasVoted, mySelections: initialSelections, tally: initialTally }: Props) {
  const { user, isAtLeast } = useAuth()
  const [selected, setSelected] = useState<string[]>(initialSelections)
  const [voted, setVoted] = useState(initialHasVoted)
  const [tally, setTally] = useState(initialTally)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isActive = vote.is_active
  const hasPermission = vote.scope.includes(user.role as UserRole)
  const canVote = hasPermission && isActive && !voted

  const totalVotes = Object.values(tally).reduce((s, n) => s + n, 0)

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

  const handleVote = async () => {
    if (selected.length === 0 || submitting) return
    setSubmitting(true)
    setError(null)
    const result = await submitVoteResponse({ vote_id: vote.id, selected_options: selected, anon_token: null })
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }
    const updated = { ...tally }
    for (const optId of selected) updated[optId] = (updated[optId] ?? 0) + 1
    setTally(updated)
    setVoted(true)
    setSubmitting(false)
  }

  return (
    <div
      className="border p-5"
      style={{
        background: '#111525',
        borderColor: isActive ? '#1E2840' : '#1A2238',
        opacity: isActive ? 1 : 0.75,
        boxShadow: isActive ? 'inset 0 1px 0 rgba(232,90,0,0.05)' : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <ScopeBadges scope={vote.scope} />
          <span
            className={clsx('text-xs font-mono px-2 py-0.5 border')}
            style={
              isActive
                ? { color: '#20D890', borderColor: 'rgba(32,216,144,0.3)', background: 'rgba(32,216,144,0.08)' }
                : { color: '#4A5570', borderColor: '#1A2238', background: 'transparent' }
            }
          >
            {isActive ? '● ACTIVE' : '○ CLOSED'}
          </span>
        </div>
        {vote.ends_at && (
          <div className="text-xs font-mono whitespace-nowrap" style={{ color: '#4A5570' }}>
            {isActive ? `ends ${formatDate(vote.ends_at)}` : `ended ${formatDate(vote.ends_at)}`}
          </div>
        )}
      </div>

      <h2 className="text-base font-mono font-semibold mb-2" style={{ color: '#EDE8DE' }}>
        {vote.title}
      </h2>
      {vote.description && (
        <p className="text-xs font-mono leading-relaxed mb-4" style={{ color: '#8A9AB5' }}>
          {vote.description}
        </p>
      )}

      <div className="text-xs font-mono mb-3" style={{ color: '#4A5570' }}>
        {vote.type === 'single' ? '// SINGLE CHOICE' : '// MULTI CHOICE'} — {totalVotes} votes cast
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {vote.options.map((option) => {
          const isSelected = selected.includes(option.id)
          const count = tally[option.id] ?? 0
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
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
                    className="h-full transition-all"
                    style={{ width: `${pct}%`, background: isSelected ? '#E85A00' : '#1E2840' }}
                  />
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {canVote && (
        <button
          onClick={handleVote}
          disabled={selected.length === 0 || submitting}
          className="px-4 py-1.5 text-xs font-mono tracking-widest border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ borderColor: '#E85A00', color: '#EDE8DE', background: 'linear-gradient(135deg, #E85A00, #C04000)' }}
        >
          {submitting ? '[ SENDING... ]' : '[ CAST VOTE ]'}
        </button>
      )}
      {voted && (
        <div className="text-xs font-mono" style={{ color: '#20D890' }}>✓ VOTE RECORDED</div>
      )}
      {error && (
        <div className="text-xs font-mono mt-1" style={{ color: '#E85A00' }}>✗ {error}</div>
      )}
      {!hasPermission && isActive && (
        <div className="text-xs font-mono" style={{ color: '#4A5570' }}>
          {user.role === 'guest'
            ? '// LOGIN REQUIRED TO PARTICIPATE'
            : '// YOUR ROLE IS NOT ELIGIBLE FOR THIS VOTE'}
        </div>
      )}
    </div>
  )
}
