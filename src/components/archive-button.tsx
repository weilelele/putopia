import type { ButtonHTMLAttributes } from 'react'

type ArchiveButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ArchiveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean
  variant?: ArchiveButtonVariant
}

export function ArchiveButton({
  className = '',
  fullWidth = false,
  type = 'button',
  variant = 'primary',
  ...props
}: ArchiveButtonProps) {
  const classes = [
    'archive-button',
    `archive-button--${variant}`,
    fullWidth ? 'archive-button--full' : '',
    className,
  ].filter(Boolean).join(' ')

  return <button className={classes} type={type} {...props} />
}
