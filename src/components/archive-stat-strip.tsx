import { ArchiveButton } from '@/components/archive-button'
import type { ReactNode } from 'react'
import Link from 'next/link'

export interface ArchiveStatItem {
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
      {items.map(({ expanded, href, label, onSelect, value }) => {
        const content = (
          <>
            <span className="archive-stat-strip__value">{value}</span>
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
          <ArchiveButton variant="secondary" aria-expanded={expanded} className="archive-stat-strip__item" key={label} onClick={onSelect} type="button">
            {content}
          </ArchiveButton>
        ) : (
          <div className="archive-stat-strip__item" key={label}>{content}</div>
        )
      })}
    </div>
  )
}
