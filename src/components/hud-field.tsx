import type { CSSProperties, ReactNode } from 'react'

/**
 * Notched HUD frame for form inputs (方案1). Wrap a normal
 * `<input className="input-dark">` / `<textarea className="input-dark">`:
 *
 *   <HudField legend="NAME"><input className="input-dark" /></HudField>
 *
 * The wrapper draws the notched border + fill; the input inside is flattened to
 * transparent by globals.css so only the frame shows. `legend` renders an
 * optional label that sits on the top border line.
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
