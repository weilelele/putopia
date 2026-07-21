import type { ReactNode } from 'react'

interface ArchiveSectionLabelProps {
  children: ReactNode
  className?: string
}

export function ArchiveSectionLabel({ children, className = '' }: ArchiveSectionLabelProps) {
  return <h2 className={`archive-section-label${className ? ` ${className}` : ''}`}>{children}</h2>
}
