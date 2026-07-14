'use client'

export type FilterOption = { key: string; label: string }

type Props = {
  options: FilterOption[]
  active: string
  onChange: (key: string) => void
  className?: string
}

export function FilterBar({ options, active, onChange, className }: Props) {
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>

      {/* Segmented control */}
      <div style={{
        display: 'inline-flex',
        background: '#0F1430',
        border: '1px solid var(--bd-faint)',
        clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
        overflow: 'hidden',
      }}>
        {options.map((opt, i) => {
          const isActive = opt.key === active
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--fs-caption)',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                padding: '0.42rem 1.05rem',
                borderRight: i < options.length - 1 ? '1px solid var(--bd-faint)' : 'none',
                background: isActive ? 'rgba(227,82,5,0.10)' : 'transparent',
                color: isActive ? 'var(--color-nucleus)' : 'var(--color-star-deep)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.12s, color 0.12s',
                outline: 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--color-star-dim)'
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--color-star-deep)'
              }}
            >
              {/* Active underline glow bar */}
              {isActive && (
                <span style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px',
                  background: 'var(--color-nucleus)',
                  boxShadow: '0 0 8px rgba(227,82,5,0.55)',
                  pointerEvents: 'none',
                }} />
              )}
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
