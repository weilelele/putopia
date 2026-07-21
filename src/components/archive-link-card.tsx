import type { AnchorHTMLAttributes } from 'react'
import Link from 'next/link'

interface ArchiveLinkCardProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string
}

export function ArchiveLinkCard({ className = '', href, ...props }: ArchiveLinkCardProps) {
  const classes = ['archive-card', 'archive-link-card', className].filter(Boolean).join(' ')
  return <Link className={classes} href={href} {...props} />
}
