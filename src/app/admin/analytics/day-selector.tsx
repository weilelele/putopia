'use client'

import { useRouter, usePathname } from 'next/navigation'

const ACCENT = '#C84406'
const MUTED  = 'rgba(245,245,245,0.35)'
const STAR   = '#F5F5F5'
const BORDER = '#151B3A'

function fmt(day: string) {
  // day is 'YYYY-MM-DD'
  const [, m, d] = day.split('-')
  return m && d ? `${m}/${d}` : day
}

// `days` is newest-first ('YYYY-MM-DD'). Selecting a day pushes ?day= so the
// server re-renders that single day's funnel.
export function DaySelector({ days, selected }: { days: string[]; selected: string }) {
  const router = useRouter()
  const pathname = usePathname()

  const idx   = days.indexOf(selected)
  const newer = idx > 0 ? days[idx - 1] : null                  // ▶ 后一天
  const older = idx >= 0 && idx < days.length - 1 ? days[idx + 1] : null  // ◀ 前一天

  const go = (day: string) => router.push(`${pathname}?day=${day}`, { scroll: false })

  const btn = (enabled: boolean): React.CSSProperties => ({
    background: 'transparent',
    border: `1px solid ${BORDER}`,
    color: enabled ? STAR : '#2A3A5A',
    cursor: enabled ? 'pointer' : 'default',
    fontFamily: 'monospace',
    fontSize: 'var(--fs-caption)',
    padding: '4px 10px',
    borderRadius: 2,
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button type="button" style={btn(!!older)} disabled={!older} onClick={() => older && go(older)}>
        ◀
      </button>
      <select
        value={selected}
        onChange={e => go(e.target.value)}
        style={{
          background: '#070c1a',
          border: `1px solid ${ACCENT}`,
          color: ACCENT,
          fontFamily: 'monospace',
          fontSize: 12,
          letterSpacing: '0.1em',
          padding: '4px 8px',
          borderRadius: 2,
        }}
      >
        {days.map((day, i) => (
          <option key={day} value={day} style={{ background: '#070c1a', color: STAR }}>
            {day}{i === 0 ? ' (最新)' : ''}
          </option>
        ))}
      </select>
      <button type="button" style={btn(!!newer)} disabled={!newer} onClick={() => newer && go(newer)}>
        ▶
      </button>
      <span style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: MUTED, marginLeft: '0.25rem' }}>
        单日 · {fmt(selected)}
      </span>
    </div>
  )
}
