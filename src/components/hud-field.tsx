import type { CSSProperties, ReactNode } from 'react'

/**
 * @deprecated Use ArchiveField for new work. This bridge remains for pages
 * that have not yet migrated to the Style A component library.
 * Wrap a normal
 * `<input className="input-dark">` / `<textarea className="input-dark">`:
 *
 *   <HudField legend="NAME"><input className="input-dark" /></HudField>
 *
 * The wrapper now inherits the flat Style A field treatment from
 * visual-refresh.css. `legend` remains for backwards compatibility.
 */
export function HudField({
  legend,
  error,
  className = '',
  style,
  children,
}: {
  legend?: string
  error?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <div className={`hud-field${error ? ' error' : ''}${className ? ' ' + className : ''}`} style={style}>
      {legend && <span className="hud-field__legend">{legend}</span>}
      {children}
    </div>
  )
}
