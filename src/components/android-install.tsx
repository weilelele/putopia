'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { ArchiveButton } from './archive-button'
import { ArchiveSheet } from './archive-sheet'
import { UpdateTimeline } from './dashboard-content'
import { usePwaInstall } from './pwa-provider'
import { ANDROID_INSTALL_URL, COLLECTIVE_INSTALL_TITLE, androidInstallUpdate } from '@/lib/android-install'
import type { DashboardUpdate } from '@/lib/dashboard-model'
import styles from './android-install.module.css'

export function useAndroidInstallFlow(source: string) {
  const pwa = usePwaInstall()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const install = async () => {
    setBusy(true)
    setMessage('')
    try {
      const outcome = await pwa.promptInstall(source)
      setMessage(outcome === 'accepted' ? 'Installation requested. Follow your browser to finish.'
        : outcome === 'dismissed' ? 'Installation canceled. You can add Collective later from your browser menu.'
          : 'Use your browser menu to add Collective to your home screen.')
    } catch {
      setMessage('Installation could not be opened. Use your browser menu to add Collective to your home screen.')
    } finally { setBusy(false) }
  }
  return { ...pwa, busy, message, install, reset: () => setMessage('') }
}

export function AndroidInstallHelp() {
  return <div className={styles.help}>
    <ol><li>Open this page in Chrome on your Android phone.</li><li>Open Chrome’s menu (⋮).</li><li>Choose “Add to home screen” or “Install app”, then confirm.</li></ol>
    <p>If you opened this link inside an email or another app, choose “Open in browser”, or copy the link into Chrome.</p>
    <p>If no installation option appears, Collective may already be installed, or your browser may not support installation.</p>
  </div>
}

export function CopyAndroidInstallLink() {
  const [message, setMessage] = useState('')
  return <div className={styles.copy}>
    <label htmlFor="android-install-link">Installation link</label>
    <input id="android-install-link" readOnly value={ANDROID_INSTALL_URL} onFocus={event => event.currentTarget.select()} />
    <ArchiveButton variant="secondary" onClick={async () => {
      try { await navigator.clipboard.writeText(ANDROID_INSTALL_URL); setMessage('Link copied.') }
      catch { setMessage('Select the link above and copy it from your browser menu.') }
    }}>Copy link</ArchiveButton>
    {message && <p role="status">{message}</p>}
  </div>
}

export function AndroidInstallDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const flow = useAndroidInstallFlow('dashboard')
  const close = () => { flow.reset(); onClose() }
  return <ArchiveSheet open={open} onClose={close} busy={flow.busy} title={COLLECTIVE_INSTALL_TITLE} footer={<div className={`archive-sheet__actions ${styles.actions}`}>
    {flow.canInstall && !flow.isInstalled && <ArchiveButton loading={flow.busy} onClick={flow.install}>Add to home screen<ArrowRight aria-hidden size={18} /></ArchiveButton>}
    <ArchiveButton variant="secondary" onClick={close}>{flow.isInstalled ? 'Done' : 'Not now'}</ArchiveButton>
  </div>}>
    <p>{flow.isInstalled ? 'Collective is installed. Open it from your home screen.' : 'Open Collective directly from your Android home screen.'}</p>
    {flow.canInstall && !flow.isInstalled && <p className={styles.help}>Your browser will confirm installation.</p>}
    {!flow.canInstall && !flow.isInstalled && <AndroidInstallHelp />}
    {flow.message && !flow.isInstalled && <p role="status">{flow.message}</p>}
  </ArchiveSheet>
}

/** System announcement only; never inserted into the Intel database or ten-item feed pool. */
export function AndroidInstallUpdates({ updates }: { updates: DashboardUpdate[] }) {
  const { platform, isInstalled } = usePwaInstall()
  const [open, setOpen] = useState(false)
  const show = platform === 'android' && !isInstalled
  const rows = show ? [androidInstallUpdate(new Date()), ...updates] : updates
  return <>
    <UpdateTimeline updates={rows} actions={{ 'collective-android-install': () => setOpen(true) }} />
    <AndroidInstallDialog open={open} onClose={() => setOpen(false)} />
  </>
}
