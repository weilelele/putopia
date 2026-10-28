'use client'
import { use, useEffect, useState, useTransition } from 'react'
import { getDashboardEvents, getDashboardOverview, getDashboardUpdates } from '@/lib/actions/dashboard'
import { DashboardVoyagerHeader, type DashboardVoyager } from '@/components/dashboard-voyager-header'
import { DashboardStats } from '@/components/dashboard-stats'
import { UpdateTimeline, EventRail } from '@/components/dashboard-content'
import { ArchiveButton } from '@/components/archive-button'

type Updates = Awaited<ReturnType<typeof getDashboardUpdates>>
type Events = Awaited<ReturnType<typeof getDashboardEvents>>
type Overview = Awaited<ReturnType<typeof getDashboardOverview>>

export function DashboardSummary({ voyager, events }: { voyager: DashboardVoyager; events: Promise<Events> }) {
  const [awaitingYou, setAwaitingYou] = useState<number | null>(null)
  useEffect(() => {
    let active = true
    void Promise.resolve(events).then(value => { if (active) setAwaitingYou(value.awaitingYou) }).catch(() => {})
    return () => { active = false }
  }, [events])
  return <DashboardVoyagerHeader voyager={{ ...voyager, awaitingYou }} />
}

export function DashboardOverview({ initial }: { initial: Promise<Overview> }) {
  const streamed = use(initial)
  const [updated, setUpdated] = useState<Overview | null>(null)
  const [pending, startTransition] = useTransition()
  const data = updated ?? streamed
  return <><DashboardStats stats={data.stats} />{data.errors.length > 0 && <div className="archive-inline-notice" role="status"><p>The latest counts could not be loaded.</p><ArchiveButton variant="secondary" loading={pending} onClick={() => startTransition(async () => { setUpdated(await getDashboardOverview()) })}>Retry counts</ArchiveButton></div>}</>
}

export function DashboardUpdates({ initial }: { initial: Promise<Updates> }) {
  const streamed = use(initial)
  const [updated, setUpdated] = useState<Updates | null>(null)
  const [pending, startTransition] = useTransition()
  const [retryFailed, setRetryFailed] = useState(false)
  const data = updated ?? streamed
  const incomplete = data.errors.length > 0 || retryFailed
  const retry = () => startTransition(async () => {
    try { setUpdated(await getDashboardUpdates()); setRetryFailed(false) } catch { setRetryFailed(true) }
  })
  return <section aria-labelledby="updates-heading"><div className="dashboard-section-heading"><h2 id="updates-heading">Updates</h2><span>Latest {data.updates.length}</span></div>
    {incomplete && <div className="archive-inline-notice" role="status"><p>Some updates could not be loaded.</p><ArchiveButton variant="secondary" loading={pending} onClick={retry}>Retry updates</ArchiveButton></div>}
    {data.updates.length ? <UpdateTimeline updates={data.updates} /> : !incomplete && <p>No updates have been published yet.</p>}
  </section>
}

export function DashboardEvents({ initial }: { initial: Promise<Events> }) {
  const streamed = use(initial)
  const [updated, setUpdated] = useState<Events | null>(null)
  const [pending, startTransition] = useTransition()
  const [retryFailed, setRetryFailed] = useState(false)
  const data = updated ?? streamed
  const incomplete = data.errors.length > 0 || retryFailed
  const retry = () => startTransition(async () => {
    try { setUpdated(await getDashboardEvents()); setRetryFailed(false) } catch { setRetryFailed(true) }
  })
  return <section aria-labelledby="events-heading"><div className="dashboard-section-heading"><h2 id="events-heading">Events</h2></div>
    {data.events.length ? <EventRail events={data.events} /> : !incomplete && <p>There are no open events right now.</p>}
    {incomplete && <div className="archive-inline-notice" role="status"><p>Some participation options are unavailable. Your other content is still here.</p><ArchiveButton variant="secondary" loading={pending} onClick={retry}>Retry events</ArchiveButton></div>}
  </section>
}

export function DashboardSectionLoading({ title }: { title: string }) {
  return <section aria-busy="true" aria-label={`Loading ${title}`}><div className="dashboard-section-heading"><h2>{title}</h2></div><p role="status">RETRIEVING ARCHIVE</p></section>
}
