import type { HTMLAttributes } from 'react'

interface ArchiveCardProps extends HTMLAttributes<HTMLDivElement> {
  actionable?: boolean
}

export function ArchiveCard({ actionable = false, className = '', ...props }: ArchiveCardProps) {
  const classes = ['archive-card', actionable ? 'is-actionable' : '', className].filter(Boolean).join(' ')
  return <div className={classes} {...props} />
}
