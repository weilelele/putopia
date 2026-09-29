'use client'
import { RootBrandHeader } from '@/components/root-brand-header'
import { useRef, useState, useTransition } from 'react'
import { DashboardVoyagerHeader } from '@/components/dashboard-voyager-header'
import { DashboardStats } from '@/components/dashboard-stats'
import { getDashboard } from '@/lib/actions/dashboard'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import styles from './guest-intro.module.css'
import SmartImage from '@/components/smart-image'
import { UpdateTimeline, EventRail } from '@/components/dashboard-content'
import { PwaInstallNudge } from '@/components/pwa-install-nudge'
import { SectionTracker } from '@/components/section-tracker'
export default function ConsoleClient({ initial }: { initial: Awaited<ReturnType<typeof getDashboard>> }) {
  const scrollContainer = useRef<HTMLElement>(null)
  const [data,setData] = useState(initial)
  const [pending,startTransition] = useTransition()
  const retry = () => startTransition(async()=> { try {setData(await getDashboard())} catch {setData(current => ({...current, errors: [...new Set([...current.errors, 'Updates', 'Events'])]}))} })
  const updatesIncomplete = data.errors.includes('Updates') || data.errors.includes('Votes')
  const eventsIncomplete = data.errors.some(error => error !== 'Updates' && error !== 'Statistics')
  return <main className="main archive-console-page" data-route-scroll ref={scrollContainer}>
    <PwaInstallNudge eligibleUser={!data.guest} scrollContainer={scrollContainer} /><SectionTracker section="dashboard" /><ArchivePageHeader hideTitle title="Dashboard" />{!data.guest && <RootBrandHeader />}
    {data.guest && <section className={styles.intro} aria-label="Join Multiverse Collective">
      <div className={styles.brand}>
        <SmartImage className={styles.wordmark} src="/assets/vi-wordmark.png" alt="Multiverse Collective" width={3699} height={1020} sizes="(max-width: 650px) 80vw, 480px" preload />
        <SmartImage className={styles.symbol} src="/assets/vi-icon.png" alt="" width={881} height={492} sizes="140px" preload />
      </div>
      <p className={styles.description}>We own devices looking into parallel worlds.</p>
      <div className={styles.actions}>
        <ArchiveLinkButton href="/new" variant="primary">REQUEST ACCESS</ArchiveLinkButton>
        <ArchiveLinkButton href="/login" variant="secondary">LOG IN</ArchiveLinkButton>
      </div>
    </section>}
    {data.voyager ? <DashboardVoyagerHeader voyager={data.voyager} /> : <DashboardStats stats={data.stats} />}
    {!data.voyager && data.errors.includes('Statistics') && <div className="archive-inline-notice" role="status"><p>The latest counts could not be loaded.</p><ArchiveButton variant="secondary" loading={pending} onClick={retry}>Retry counts</ArchiveButton></div>}
    <div className="dashboard-content-grid"><section aria-labelledby="updates-heading"><div className="dashboard-section-heading"><h2 id="updates-heading">Updates</h2><span>Latest {data.updates.length}</span></div>
      {updatesIncomplete && <div className="archive-inline-notice" role="status"><p>Some updates could not be loaded.</p><ArchiveButton variant="secondary" loading={pending} onClick={retry}>Retry updates</ArchiveButton></div>}
      {data.updates.length ? <UpdateTimeline updates={data.updates} /> : !updatesIncomplete && <p>No updates have been published yet.</p>}
    </section>
    <section aria-labelledby="events-heading"><div className="dashboard-section-heading"><h2 id="events-heading">Events</h2></div>
      {data.events.length ? <EventRail events={data.events} /> : !eventsIncomplete && <p>There are no open events right now.</p>}
      {eventsIncomplete && <div className="archive-inline-notice" role="status"><p>Some participation options are unavailable. Your other content is still here.</p><ArchiveButton variant="secondary" loading={pending} onClick={retry}>Retry events</ArchiveButton></div>}
    </section></div>
  </main>
}
