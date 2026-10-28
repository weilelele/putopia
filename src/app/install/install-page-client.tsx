'use client'

import { ArrowRight } from 'lucide-react'
import { AndroidInstallHelp, CopyAndroidInstallLink, useAndroidInstallFlow } from '@/components/android-install'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { COLLECTIVE_INSTALL_TITLE, COLLECTIVE_INSTALL_DESCRIPTION } from '@/lib/android-install'
import styles from './install.module.css'

export function InstallPageClient({ source }: { source: string }) {
  const flow = useAndroidInstallFlow(source)
  return <main className={`main ${styles.page}`} data-route-scroll>
    <ArchivePageHeader title="Collective on your phone" />
    <h2>{COLLECTIVE_INSTALL_TITLE}</h2>
    <p>{COLLECTIVE_INSTALL_DESCRIPTION}</p>
    {flow.platform === 'unknown' ? <p role="status">Checking installation options…</p>
      : flow.isInstalled ? <p role="status">You’re already using the app, or installation has completed. Open Collective from your home screen.</p>
        : flow.platform === 'android' ? <>
          {flow.canInstall && <ArchiveButton loading={flow.busy} fullWidth onClick={flow.install}>Add to home screen<ArrowRight aria-hidden size={18} /></ArchiveButton>}
          {flow.message && <p role="status">{flow.message}</p>}
          <AndroidInstallHelp />
        </> : <p>Installation is currently available on Android. Open this link in Chrome on your Android phone. You can continue using Collective in your browser on other devices.</p>}
    <CopyAndroidInstallLink />
    <ArchiveLinkButton href="/console" variant="secondary" fullWidth>Continue to Dashboard<ArrowRight aria-hidden size={18} /></ArchiveLinkButton>
  </main>
}
