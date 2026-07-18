'use client'

import { useState } from 'react'

const ACCENT = '#C84406'
const MUTED  = 'rgba(245,245,245,0.35)'
const STAR   = '#F5F5F5'
const BORDER = '#151B3A'

type TabKey = 'conversion' | 'retention' | 'membership'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'conversion', label: 'CONVERSION · 转化漏斗' },
  { key: 'retention',  label: 'RETENTION · 新增 / 留存' },
  { key: 'membership', label: 'MEMBERSHIP · 会员转化' },
]

export function FunnelTabs({
  conversion,
  retention,
  membership,
}: {
  conversion: React.ReactNode
  retention: React.ReactNode
  membership: React.ReactNode
}) {
  const [tab, setTab] = useState<TabKey>('conversion')

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: `1px solid ${BORDER}` }}>
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.6rem 1rem',
                marginBottom: '-1px',
                fontFamily: 'monospace',
                fontSize: 'var(--fs-caption)',
                letterSpacing: '0.15em',
                color: active ? STAR : MUTED,
                borderBottom: `2px solid ${active ? ACCENT : 'transparent'}`,
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'conversion' ? conversion : tab === 'retention' ? retention : membership}
    </div>
  )
}
