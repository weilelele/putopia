'use client'

import { ArchiveTabs } from '@/components/archive-tabs'

export type FilterOption = { key: string; label: string }

type Props = {
  options: FilterOption[]
  active: string
  onChange: (key: string) => void
  className?: string
}

export function FilterBar({ options, active, onChange, className }: Props) {
  return (
    <div className={`archive-filter-bar${className ? ` ${className}` : ''}`}>
      <ArchiveTabs
        activeId={active}
        ariaLabel="Content filters"
        items={options.map(({ key, label }) => ({ id: key, label }))}
        onChange={onChange}
      />
    </div>
  )
}
