'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { createVote } from '@/lib/actions/votes'
import type { VoteType, UserRole } from '@/types/database'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveTabs } from '@/components/archive-tabs'

type Props = {
  onClose: () => void
  onCreated: () => void
}

const SCOPE_OPTIONS: { value: UserRole; label: string; desc: string }[] = [
  { value: 'applicant', label: 'APPLICANT', desc: 'Applicants' },
  { value: 'voyager',   label: 'VOYAGER',   desc: 'Voyagers' },
  { value: 'architect', label: 'ARCHITECT', desc: 'Architects' },
]

export function CreateVoteModal({ onClose, onCreated }: Props) {
  const [title, setTitle]     = useState('')
  const [description, setDesc]= useState('')
  const [type, setType]       = useState<VoteType>('single')
  const [scope, setScope]     = useState<UserRole[]>(['applicant', 'voyager', 'architect'])
  const [options, setOptions] = useState(['', ''])
  const [endsAt, setEndsAt]   = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const toggleScope = (role: UserRole) => {
    setScope((prev) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role]
    )
  }

  const setOption = (i: number, val: string) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)))

  const addOption = () => setOptions((prev) => [...prev, ''])

  const removeOption = (i: number) =>
    setOptions((prev) => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    if (scope.length === 0) { setError('Select at least one participation scope.'); return }
    const validOptions = options.map((o) => o.trim()).filter(Boolean)
    if (validOptions.length < 2) { setError('At least 2 options are required.'); return }

    setSaving(true)
    setError(null)

    const result = await createVote({
      title: title.trim(),
      description: description.trim() || null,
      type,
      scope,
      options: validOptions.map((label, i) => ({ id: `opt_${i}`, label })),
      is_active: true,
      created_by: null,
      ends_at: endsAt || null,
    })

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    onCreated()
  }

  return (
    <div
      className="archive-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <ArchiveCard
        aria-labelledby="create-vote-title"
        aria-modal="true"
        className="archive-modal archive-vote-modal"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="archive-modal__eyebrow">NEW VOTE</div>
            <h2 id="create-vote-title">CREATE VOTE</h2>
          </div>
          <ArchiveButton aria-label="Close dialog" onClick={onClose} variant="ghost">
            <X size={18} />
          </ArchiveButton>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <ArchiveField htmlFor="vote-title" label="TITLE *">
            <input
              id="vote-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Vote title..."
              maxLength={200}
            />
          </ArchiveField>

          {/* Description */}
          <ArchiveField htmlFor="vote-description" label="DESCRIPTION">
            <textarea
              id="vote-description"
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Provide context for this vote (optional)..."
              rows={3}
            />
          </ArchiveField>

          {/* Type + Ends At */}
          <div className="archive-modal-grid archive-modal-grid--two">
            <div className="archive-choice-group">
              <div className="archive-field__label">VOTE TYPE</div>
              <ArchiveTabs
                activeId={type}
                ariaLabel="Vote type"
                items={[{ id: 'single', label: 'SINGLE' }, { id: 'multi', label: 'MULTI' }]}
                onChange={(value) => setType(value as VoteType)}
              />
            </div>

            <ArchiveField htmlFor="vote-ends-at" label="ENDS AT">
              <input
                id="vote-ends-at"
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </ArchiveField>
          </div>

          {/* Scope — multi-select */}
          <div>
            <div className="archive-field__label">PARTICIPATION SCOPE</div>
            <div className="archive-scope-options">
              {SCOPE_OPTIONS.map(({ value, label }) => {
                const active = scope.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleScope(value)}
                    className={`archive-scope-option${active ? ' is-active' : ''}`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {scope.length > 0 && (
              <p className="text-xs font-mono mt-1.5" style={{ color: 'rgba(245,245,245,0.35)' }}>
                {scope.length === 3
                  ? '— open to all members'
                  : `— ${scope.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(' + ')} only`}
              </p>
            )}
          </div>

          {/* Options */}
          <div>
            <div className="archive-field__label">OPTIONS · MINIMUM 2</div>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-mono w-6 text-right shrink-0" style={{ color: 'rgba(245,245,245,0.35)' }}>
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <input
                    className="archive-inline-input"
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    maxLength={200}
                  />
                  {options.length > 2 && (
                    <ArchiveButton
                      aria-label={`Remove option ${i + 1}`}
                      type="button"
                      onClick={() => removeOption(i)}
                      variant="ghost"
                    >
                      <Trash2 size={14} />
                    </ArchiveButton>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <ArchiveButton
                type="button"
                onClick={addOption}
                variant="ghost"
              >
                <Plus size={12} /> ADD OPTION
              </ArchiveButton>
            )}
          </div>

          {error && (
            <div className="text-xs font-mono" style={{ color: '#C84406' }}>✗ {error}</div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t" style={{ borderColor: 'rgba(227,82,5,0.16)' }}>
            <ArchiveButton
              type="button"
              onClick={onClose}
              variant="ghost"
            >
              CANCEL
            </ArchiveButton>
            <ArchiveButton
              type="submit"
              disabled={saving}
              variant="primary"
            >
              {saving ? 'CREATING...' : 'CREATE VOTE'}
            </ArchiveButton>
          </div>
        </form>
      </ArchiveCard>
    </div>
  )
}
