'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getDashboard } from '@/lib/actions/dashboard'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { UpdateTimeline, EventRail } from '@/components/dashboard-content'
import { PwaInstallNudge } from '@/components/pwa-install-nudge'
import { SectionTracker } from '@/components/section-tracker'
export default function ConsoleClient({ initial }: { initial: Awaited<ReturnType<typeof getDashboard>> }) {
  const scrollContainer = useRef<HTMLElement>(null)
  const [data,setData] = useState(initial)
  const [pending,startTransition] = useTransition()
  const router = useRouter()
  const retry = () => startTransition(async()=> { try {setData(await getDashboard())} catch {router.refresh()} })
  return <main className="main archive-console-page" ref={scrollContainer}>
    <PwaInstallNudge eligibleUser={!data.guest} scrollContainer={scrollContainer} /><SectionTracker section="dashboard" /><ArchiveBrandHeader /><ArchivePageHeader title="Dashboard" />
    <section aria-labelledby="updates-heading"><div className="dashboard-section-heading"><h2 id="updates-heading">Updates</h2><span>Latest {data.updates.length}</span></div>
      {data.errors.includes('Updates') && <div className="archive-inline-notice" role="status"><p>Some updates could not be loaded.</p><ArchiveButton variant="secondary" loading={pending} onClick={retry}>Retry updates</ArchiveButton></div>}
      {data.updates.length ? <UpdateTimeline updates={data.updates} /> : !data.errors.includes('Updates') && <p>No updates have been published yet.</p>}
    </section>
    <section aria-labelledby="events-heading"><div className="dashboard-section-heading"><h2 id="events-heading">Events</h2></div>
      {data.events.length ? <EventRail events={data.events} /> : <p>{data.guest ? 'Log in to find events you can participate in.' : 'There are no open events for you right now.'}</p>}
      {data.guest && <ArchiveLinkButton href="/login?redirect=%2Fconsole" variant="secondary">Log in</ArchiveLinkButton>}
      {data.errors.some(error=>error!=='Updates') && <div className="archive-inline-notice" role="status"><p>Some participation options are unavailable. Your other content is still here.</p><ArchiveButton variant="secondary" loading={pending} onClick={retry}>Retry events</ArchiveButton></div>}
    </section>
  </main>
}
