import type { ReactNode } from 'react'

interface ArchivePageHeaderProps {
  accent?: string
  action?: ReactNode
  className?: string
  hideTitle?: boolean
  identity?: ReactNode
  title: string
}

export function ArchivePageHeader({ accent, action, className = '', hideTitle = false, identity, title }: ArchivePageHeaderProps) {
  const heading = <h1 className={hideTitle ? 'sr-only' : 'archive-page-header__title'}>
    <span>{title}</span>
    {accent && <span className="archive-page-header__accent">{accent}</span>}
  </h1>
  if (hideTitle && !identity && !action) return heading

  return (
    <header className={`archive-page-header${hideTitle ? ' archive-page-header--actions' : ''}${className ? ` ${className}` : ''}`}>
      {heading}
      {identity && <div className="archive-page-header__identity">{identity}</div>}
      {action && <div className="archive-page-header__action">{action}</div>}
    </header>
  )
}
