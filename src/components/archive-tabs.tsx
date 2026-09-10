'use client'
import { useId, type Ref } from 'react'
export interface ArchiveTabItem { count?: number; id: string; label: string; disabled?: boolean; panelId?: string }
interface ArchiveTabsProps { activeId: string; ariaLabel: string; containerRef?: Ref<HTMLDivElement>; items: ArchiveTabItem[]; onChange: (id: string) => void; mode?: 'tabs' | 'filter' }
export function ArchiveTabs({ activeId, ariaLabel, containerRef, items, onChange, mode = 'tabs' }: ArchiveTabsProps) {
  const prefix = useId()
  return <div className="archive-tabs" aria-label={ariaLabel} ref={containerRef} role={mode === 'tabs' ? 'tablist' : 'group'}>
    {items.map(({ count, id, label, disabled, panelId }) => {
      const active = id === activeId
      return <button key={id} id={panelId ? `${panelId}-tab` : `${prefix}-${id}`} type="button" disabled={disabled} role={mode === 'tabs' ? 'tab' : undefined}
        aria-selected={mode === 'tabs' ? active : undefined} aria-pressed={mode === 'filter' ? active : undefined} aria-controls={panelId}
        tabIndex={mode === 'tabs' ? (active ? 0 : -1) : 0} className={`archive-tabs__tab${active ? ' is-active' : ''}`}
        onClick={() => onChange(id)} onKeyDown={event => {
          if (mode !== 'tabs' || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const buttons = [...event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
          const index = buttons.indexOf(event.currentTarget)
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
          buttons[next]?.focus()
        }}><span>{label}</span>{typeof count === 'number' && <span className="archive-tabs__count">{count}</span>}</button>
    })}
  </div>
}
