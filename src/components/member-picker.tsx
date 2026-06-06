'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { searchMembers } from '@/lib/actions/profile'

export type MemberValue = { id: string; name: string } | null

interface MemberPickerProps {
  label: string
  value: MemberValue
  onChange: (v: MemberValue) => void
  inputStyle?: React.CSSProperties
}

const ROLE_COLOR: Record<string, string> = {
  architect: '#E8A020',
  voyager: '#E85D04',
}

export function MemberPicker({ label, value, onChange, inputStyle }: MemberPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; display_name: string; role: string }[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const baseInput: React.CSSProperties = {
    width: '100%',
    background: '#0F1430',
    border: '1px solid rgba(255,107,53,0.16)',
    color: '#F5F5F5',
    padding: '7px 10px',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-label)',
    outline: 'none',
    boxSizing: 'border-box',
    ...inputStyle,
  }

  const search = useCallback(async (q: string) => {
    setLoading(true)
    const data = await searchMembers(q)
    setResults(data)
    setLoading(false)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length === 0) {
      setResults([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => search(query), 280)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (member: { id: string; display_name: string }) => {
    onChange({ id: member.id, name: member.display_name })
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const clear = () => onChange(null)

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: 'rgba(245,245,245,0.35)',
    fontSize: 'var(--fs-caption)',
    letterSpacing: '0.1em',
    marginBottom: '4px',
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <label style={labelStyle}>{label}</label>

      {value ? (
        // Selected state
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#0F1430',
          border: '1px solid rgba(232,93,4,0.4)',
          padding: '6px 10px',
          ...inputStyle,
        }}>
          <span style={{ color: '#E85D04', fontSize: 'var(--fs-caption)', fontFamily: 'var(--font-mono)' }}>✓</span>
          <span style={{ color: '#F5F5F5', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', flex: 1 }}>
            {value.name}
          </span>
          <button
            type="button"
            onClick={clear}
            style={{ background: 'none', border: 'none', color: 'rgba(245,245,245,0.35)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', padding: '0 2px', lineHeight: 1 }}
          >×</button>
        </div>
      ) : (
        // Search input
        <input
          style={baseInput}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search members by name..."
          onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(232,93,4,0.5)' }}
          onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,107,53,0.16)' }}
          autoComplete="off"
        />
      )}

      {/* Dropdown */}
      {open && !value && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 2px)',
          left: 0,
          right: 0,
          background: '#151B3A',
          border: '1px solid rgba(255,107,53,0.16)',
          zIndex: 100,
          maxHeight: '200px',
          overflowY: 'auto',
        }}>
          {loading && (
            <div style={{ padding: '8px 12px', color: 'rgba(245,245,245,0.35)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)' }}>
              Searching...
            </div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ padding: '8px 12px', color: 'rgba(245,245,245,0.35)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)' }}>
              No members found
            </div>
          )}
          {!loading && results.map(m => (
            <div
              key={m.id}
              onMouseDown={() => select(m)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid #0F1430',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,53,0.16)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: '#F5F5F5', flex: 1 }}>
                {m.display_name}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--fs-caption)',
                letterSpacing: '0.1em',
                color: ROLE_COLOR[m.role] ?? 'rgba(245,245,245,0.55)',
                border: `1px solid ${ROLE_COLOR[m.role] ?? 'rgba(245,245,245,0.55)'}`,
                padding: '1px 5px',
                opacity: 0.8,
              }}>
                {m.role.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
