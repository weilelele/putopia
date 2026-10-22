'use client'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { ArchiveButton } from './archive-button'
/** Native dialog supplies modal focus containment, background inertness and focus return. */
export function ArchiveSheet({ open, onClose, title, dirty = false, busy = false, className, headerless = false, footer, size = 'default', children }: { open: boolean; onClose: () => void; title: string; dirty?: boolean; busy?: boolean; children: ReactNode; className?: string; headerless?: boolean; footer?: ReactNode; size?: 'default' | 'wide' | 'fullscreen' }) {
  const titleId = useId()
  const keepEditing = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const [confirmExit, setConfirmExit] = useState(false)
  const close = () => { if (busy) return; if (dirty) setConfirmExit(true); else onClose() }
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.postMessage({ type: 'sheet-open' }, location.origin)
    return () => { document.body.style.overflow = previousOverflow; window.postMessage({ type: 'sheet-close' }, location.origin); element.close() }
  }, [open])
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const bridge = (window as Window & { ReactNativeWebView?: { postMessage: (message: string) => void } }).ReactNativeWebView
    bridge?.postMessage(JSON.stringify({ type: 'ui-modal', open }))
    if (open && dirty) window.addEventListener('beforeunload', guard)
    return () => { window.removeEventListener('beforeunload', guard); bridge?.postMessage(JSON.stringify({ type: 'ui-modal', open: false })) }
  }, [open, dirty])
  useEffect(() => {
    if (confirmExit) keepEditing.current?.focus()
  }, [confirmExit])
  return <dialog ref={dialog} tabIndex={-1} onKeyDown={event => {
    if (event.key !== 'Tab') return
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]'))
      .filter(element => !element.matches(':disabled') && element.tabIndex >= 0 && element.getClientRects().length > 0)
    const first = items[0]
    const last = items.at(-1)
    if (!first) { event.preventDefault(); event.currentTarget.focus(); return }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) { event.preventDefault(); first.focus() }
  }} onClose={() => setConfirmExit(false)} className={`archive-sheet archive-sheet--${size}${headerless ? ' archive-sheet--headerless' : ''}${className ? ` ${className}` : ''}`} aria-label={headerless && !confirmExit ? title : undefined} aria-labelledby={!headerless || confirmExit ? titleId : undefined} aria-modal="true" onCancel={event => { event.preventDefault(); close() }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close() } }}>
    <header className={headerless && !confirmExit ? 'archive-sheet__header--minimal' : undefined}>
      <span className="archive-sheet__accent" aria-hidden />
      <ArchiveButton ref={closeButton} className="archive-sheet__close" variant="ghost" aria-label="Close" disabled={busy} onClick={close} type="button"><X size={22} /></ArchiveButton>
      {(!headerless || confirmExit) && <h2 id={titleId}>{confirmExit ? 'Discard your changes?' : title}</h2>}
    </header>
    {confirmExit ? <div className="archive-sheet__body"><p>Your unsaved edits will be lost.</p></div> : null}
    <div className="archive-sheet__body" hidden={confirmExit} style={confirmExit ? { display: 'none' } : undefined}>{children}</div>
    {confirmExit ? <footer className="archive-sheet__footer"><div className="archive-sheet__actions">
      <ArchiveButton ref={keepEditing} onClick={() => { setConfirmExit(false); closeButton.current?.focus() }}>Keep editing</ArchiveButton>
      <ArchiveButton variant="destructive" onClick={() => { setConfirmExit(false); onClose() }}>Discard changes</ArchiveButton>
    </div></footer> : footer ? <footer className="archive-sheet__footer">{footer}</footer> : null}
  </dialog>
}
