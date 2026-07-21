import type { Ref } from 'react'

export interface ArchiveTabItem {
  count?: number
  id: string
  label: string
}

interface ArchiveTabsProps {
  activeId: string
  ariaLabel: string
  containerRef?: Ref<HTMLDivElement>
  items: ArchiveTabItem[]
  onChange: (id: string) => void
}

export function ArchiveTabs({ activeId, ariaLabel, containerRef, items, onChange }: ArchiveTabsProps) {
  return (
    <div className="archive-tabs" aria-label={ariaLabel} ref={containerRef} role="tablist">
      {items.map(({ count, id, label }) => {
        const active = id === activeId
        return (
          <button
            aria-selected={active}
            className={`archive-tabs__tab${active ? ' is-active' : ''}`}
            key={id}
            onClick={() => onChange(id)}
            role="tab"
            type="button"
          >
            <span>{label}</span>
            {typeof count === 'number' && <span className="archive-tabs__count">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
