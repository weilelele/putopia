import type { ReactNode } from 'react'

interface ArchiveFieldProps {
  children: ReactNode
  className?: string
  error?: ReactNode
  htmlFor: string
  label: string
}

export function ArchiveField({ children, className = '', error, htmlFor, label }: ArchiveFieldProps) {
  return (
    <div className={`archive-field${className ? ` ${className}` : ''}`}>
      <label className="archive-field__label" htmlFor={htmlFor}>{label}</label>
      <div className={`archive-field__control${error ? ' is-error' : ''}`}>{children}</div>
      {error && <div className="archive-field__error" role="alert">{error}</div>}
    </div>
  )
}
