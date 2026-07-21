import type { ReactNode } from 'react'
import Link from 'next/link'

export interface ArchiveStatItem {
  color?: string
  expanded?: boolean
  href?: string
  label: string
  onSelect?: () => void
  value: ReactNode
}

interface ArchiveStatStripProps {
  items: ArchiveStatItem[]
}

export function ArchiveStatStrip({ items }: ArchiveStatStripProps) {
  return (
    <div className="archive-stat-strip">
      {items.map(({ color, expanded, href, label, onSelect, value }) => {
        const content = (
          <>
            <span className="archive-stat-strip__value" style={color ? { color } : undefined}>{value}</span>
            <span className="archive-stat-strip__label">{label}</span>
          </>
        )

        if (href) {
          return (
            <Link className="archive-stat-strip__item" href={href} key={label}>
              {content}
            </Link>
          )
        }

        return onSelect ? (
          <button aria-expanded={expanded} className="archive-stat-strip__item" key={label} onClick={onSelect} type="button">
            {content}
          </button>
        ) : (
          <div className="archive-stat-strip__item" key={label}>{content}</div>
        )
      })}
    </div>
  )
}
