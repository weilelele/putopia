import type { AnchorHTMLAttributes } from 'react'
import Link from 'next/link'

type ArchiveLinkButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ArchiveLinkButtonProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  fullWidth?: boolean
  href: string
  variant?: ArchiveLinkButtonVariant
}

export function ArchiveLinkButton({
  className = '',
  fullWidth = false,
  href,
  variant = 'secondary',
  ...props
}: ArchiveLinkButtonProps) {
  const classes = [
    'archive-button',
    `archive-button--${variant}`,
    fullWidth ? 'archive-button--full' : '',
    className,
  ].filter(Boolean).join(' ')

  return <Link className={classes} href={href} {...props} />
}
