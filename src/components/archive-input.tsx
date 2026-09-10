import type { ComponentPropsWithRef } from 'react'

/** Native contracts (including refs, file inputs and form actions) are preserved. */
export function ArchiveInput({ className = '', type = 'text', ...props }: ComponentPropsWithRef<'input'>) {
  return <input {...props} type={type} className={`archive-input archive-input--${type} ${className}`} />
}
export function ArchiveTextarea({ className = '', ...props }: ComponentPropsWithRef<'textarea'>) {
  return <textarea {...props} className={`archive-input archive-textarea ${className}`} />
}
export function ArchiveSelect({ className = '', ...props }: ComponentPropsWithRef<'select'>) {
  return <select {...props} className={`archive-input archive-select ${className}`} />
}
