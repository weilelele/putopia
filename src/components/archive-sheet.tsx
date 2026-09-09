'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { ArchiveButton } from './archive-button'
/** Native dialog supplies modal focus containment, background inertness and focus return. */
export function ArchiveSheet({ open, onClose, title, dirty = false, busy = false, children }: { open: boolean; onClose: () => void; title: string; dirty?: boolean; busy?: boolean; children: ReactNode }) {
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
  return <dialog ref={dialog} className="archive-sheet" aria-label={title} onCancel={event => { event.preventDefault(); close() }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close() } }}>
    <header><h2>{title}</h2><button aria-label="Close" disabled={busy} onClick={close} type="button"><X size={22} /></button></header>
    {confirmExit ? <div className="archive-sheet__body"><h3>Discard your changes?</h3><p>Your unsaved edits will be lost.</p><ArchiveButton onClick={() => setConfirmExit(false)}>Keep editing</ArchiveButton><ArchiveButton variant="destructive" onClick={() => { setConfirmExit(false); onClose() }}>Discard changes</ArchiveButton></div> : <div className="archive-sheet__body">{children}</div>}
  </dialog>
}
