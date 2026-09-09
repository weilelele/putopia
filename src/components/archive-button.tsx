import type { ButtonHTMLAttributes } from 'react'
import { LoaderCircle } from 'lucide-react'
type ArchiveButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
interface ArchiveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { fullWidth?: boolean; variant?: ArchiveButtonVariant; loading?: boolean; size?: 'default' | 'compact' }
export function ArchiveButton({ className = '', fullWidth = false, type = 'button', variant = 'primary', loading = false, size = 'default', disabled, children, ...props }: ArchiveButtonProps) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
    className={['archive-button', `archive-button--${variant}`, `archive-button--${size}`, fullWidth ? 'archive-button--full' : '', className].filter(Boolean).join(' ')}>
    {loading && <LoaderCircle className="archive-spinner" aria-hidden size={18} />}{children}
  </button>
}
