'use client'
import { RootBrandHeader } from '@/components/root-brand-header'
import { Suspense } from 'react'
import { DashboardStats } from '@/components/dashboard-stats'
import type { getDashboardIdentity, getDashboardOverview, getDashboardUpdates, getDashboardEvents } from '@/lib/actions/dashboard'
import { DashboardOverview, DashboardSummary, DashboardUpdates, DashboardEvents, DashboardSectionLoading } from './dashboard-sections'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import styles from './guest-intro.module.css'
import SmartImage from '@/components/smart-image'
import { SectionTracker } from '@/components/section-tracker'
import { MissionBoard } from '@/components/mission-board'
import { canAccessMissionBoard } from '@/lib/mission-board'
import { REQUEST_ACCESS_HREF } from '@/lib/request-access'
export default function ConsoleClient({ initial: data, overview, updates, events }: {
  initial: Awaited<ReturnType<typeof getDashboardIdentity>>
  overview: Promise<Awaited<ReturnType<typeof getDashboardOverview>>>
  updates: Promise<Awaited<ReturnType<typeof getDashboardUpdates>>>
  events: Promise<Awaited<ReturnType<typeof getDashboardEvents>>>
}) {
  return <main className="main archive-console-page" data-route-scroll>
    <SectionTracker section="dashboard" /><ArchivePageHeader hideTitle title="Dashboard" />{!data.guest && <RootBrandHeader />}
    {data.guest && <section className={styles.intro} aria-label="Join Multiverse Collective">
      <div className={styles.brand}>
        <SmartImage className={styles.wordmark} src="/assets/vi-wordmark.png" alt="Multiverse Collective" width={3699} height={1020} sizes="(max-width: 650px) 80vw, 480px" preload />
        <SmartImage className={styles.symbol} src="/assets/vi-icon.png" alt="" width={881} height={492} sizes="140px" preload />
      </div>
      <p className={styles.description}>We own devices looking into parallel worlds.</p>
      <div className={styles.actions}>
        <ArchiveLinkButton href={REQUEST_ACCESS_HREF} variant="primary">REQUEST ACCESS</ArchiveLinkButton>
        <ArchiveLinkButton href="/login" variant="secondary">LOG IN</ArchiveLinkButton>
      </div>
    </section>}
    {data.voyager ? <DashboardSummary voyager={data.voyager} events={events} /> : <Suspense fallback={<DashboardStats stats={null} />}><DashboardOverview initial={overview} /></Suspense>}
    {data.voyager && !canAccessMissionBoard(data.voyager.role) && <MissionBoard unlocked={false} />}
    <div className="dashboard-content-grid">
      <Suspense fallback={<DashboardSectionLoading title="Updates" />}><DashboardUpdates initial={updates} /></Suspense>
      <Suspense fallback={<DashboardSectionLoading title="Events" />}><DashboardEvents initial={events} /></Suspense>
    </div>
  </main>
}
