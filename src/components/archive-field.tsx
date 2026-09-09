import { Children, cloneElement, isValidElement, type ReactNode, type ReactElement } from 'react'
interface ArchiveFieldProps { children: ReactNode; className?: string; error?: ReactNode; helpText?: ReactNode; htmlFor: string; label: string }
export function ArchiveField({ children, className = '', error, helpText, htmlFor, label }: ArchiveFieldProps) {
  const description = [helpText ? `${htmlFor}-help` : '', error ? `${htmlFor}-error` : ''].filter(Boolean).join(' ')
  const controls = Children.map(children, child => {
    if (!isValidElement(child) || typeof child.type !== 'string' || !['input', 'textarea', 'select'].includes(child.type)) return child
    const element = child as ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>
    return cloneElement(element, { id: element.props.id ?? htmlFor, 'aria-describedby': [element.props['aria-describedby'], description].filter(Boolean).join(' ') || undefined, 'aria-invalid': error ? true : element.props['aria-invalid'] })
  })
  return <div className={`archive-field ${className}`}><label className="archive-field__label" htmlFor={htmlFor}>{label}</label>
    {helpText && <p className="archive-field__help" id={`${htmlFor}-help`}>{helpText}</p>}
    <div className={`archive-field__control${error ? ' is-error' : ''}`}>{controls}</div>
    {error && <div className="archive-field__error" id={`${htmlFor}-error`} role="alert">{error}</div>}
  </div>
}
