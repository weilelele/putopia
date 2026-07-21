import type { ReactNode } from 'react'

interface ArchivePageHeaderProps {
  accent?: string
  action?: ReactNode
  className?: string
  identity?: ReactNode
  title: string
}

export function ArchivePageHeader({ accent, action, className = '', identity, title }: ArchivePageHeaderProps) {
  return (
    <header className={`archive-page-header${className ? ` ${className}` : ''}`}>
      <h1 className="archive-page-header__title">
        <span>{title}</span>
        {accent && <span className="archive-page-header__accent">{accent}</span>}
      </h1>
      {identity && <div className="archive-page-header__identity">{identity}</div>}
      {action && <div className="archive-page-header__action">{action}</div>}
    </header>
  )
}
