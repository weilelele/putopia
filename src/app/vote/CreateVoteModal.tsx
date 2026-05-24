'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { createVote } from '@/lib/actions/votes'
import type { VoteType, UserRole } from '@/types/database'

type Props = {
  onClose: () => void
  onCreated: () => void
}

const SCOPE_OPTIONS: { value: UserRole; label: string; desc: string }[] = [
  { value: 'applicant', label: 'APPLICANT', desc: 'Applicants' },
  { value: 'voyager',   label: 'VOYAGER',   desc: 'Voyagers' },
  { value: 'architect', label: 'ARCHITECT', desc: 'Architects' },
]

const S = {
  label: { display: 'block', color: '#4A5570', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '4px' } as const,
  input: { width: '100%', background: '#0D1020', border: '1px solid #1E2840', color: '#EDE8DE', padding: '7px 10px', fontFamily: 'var(--font-mono, monospace)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' } as const,
  area:  { width: '100%', background: '#0D1020', border: '1px solid #1E2840', color: '#EDE8DE', padding: '7px 10px', fontFamily: 'var(--font-mono, monospace)', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' } as const,
}

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
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full max-w-lg mx-4 border p-6 overflow-y-auto"
        style={{ background: '#111525', borderColor: '#1E2840', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs font-mono tracking-widest mb-1" style={{ color: '#4A5570' }}>// NEW VOTE</div>
            <h2 className="text-base font-mono font-semibold" style={{ color: '#EDE8DE' }}>CREATE VOTE</h2>
          </div>
          <button onClick={onClose} style={{ color: '#4A5570' }} className="hover:text-[#EDE8DE] transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label style={S.label}>TITLE *</label>
            <input
              style={S.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Vote title..."
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <label style={S.label}>DESCRIPTION</label>
            <textarea
              style={{ ...S.area, minHeight: '72px' } as React.CSSProperties}
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Provide context for this vote (optional)..."
              rows={3}
            />
          </div>

          {/* Type + Ends At */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={S.label}>VOTE TYPE</label>
              <div className="flex gap-2">
                {(['single', 'multi'] as VoteType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className="flex-1 text-xs font-mono py-1.5 border tracking-widest transition-all"
                    style={
                      type === t
                        ? { borderColor: '#E85A00', color: '#EDE8DE', background: 'rgba(232,90,0,0.15)' }
                        : { borderColor: '#1E2840', color: '#4A5570', background: 'transparent' }
                    }
                  >
                    {t === 'single' ? 'SINGLE' : 'MULTI'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={S.label}>ENDS AT</label>
              <input
                type="date"
                style={{ ...S.input, colorScheme: 'dark' }}
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          {/* Scope — multi-select */}
          <div>
            <label style={S.label}>PARTICIPATION SCOPE (MULTI-SELECT)</label>
            <div className="flex gap-2">
              {SCOPE_OPTIONS.map(({ value, label }) => {
                const active = scope.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleScope(value)}
                    className="flex-1 text-xs font-mono py-1.5 px-2 border tracking-widest transition-all"
                    style={
                      active
                        ? { borderColor: '#E85A00', color: '#EDE8DE', background: 'rgba(232,90,0,0.15)' }
                        : { borderColor: '#1E2840', color: '#4A5570', background: 'transparent' }
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {scope.length > 0 && (
              <p className="text-xs font-mono mt-1.5" style={{ color: '#4A5570' }}>
                {scope.length === 3
                  ? '— open to all members'
                  : `— ${scope.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(' + ')} only`}
              </p>
            )}
          </div>

          {/* Options */}
          <div>
            <label style={S.label}>OPTIONS (MIN. 2)</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-mono w-6 text-right shrink-0" style={{ color: '#4A5570' }}>
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <input
                    style={{ ...S.input, flex: 1 } as React.CSSProperties}
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    maxLength={200}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="shrink-0 transition-colors"
                      style={{ color: '#4A5570' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#E85A00')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#4A5570')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2 flex items-center gap-1.5 text-xs font-mono tracking-widest transition-colors"
                style={{ color: '#4A5570' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#8A9AB5')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#4A5570')}
              >
                <Plus size={12} /> ADD OPTION
              </button>
            )}
          </div>

          {error && (
            <div className="text-xs font-mono" style={{ color: '#E85A00' }}>✗ {error}</div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t" style={{ borderColor: '#1A2238' }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-mono tracking-widest border transition-all"
              style={{ borderColor: '#1E2840', color: '#4A5570', background: 'transparent' }}
            >
              [ CANCEL ]
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-xs font-mono tracking-widest border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: '#E85A00', color: '#EDE8DE', background: 'linear-gradient(135deg, #E85A00, #C04000)' }}
            >
              {saving ? '[ CREATING... ]' : '[ CREATE VOTE ]'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
