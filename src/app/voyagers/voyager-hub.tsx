'use client'
import { useAuth } from '@/lib/auth-context'
import { VoyagerLogs } from '@/app/logs/logs-view'
import { SectionTracker } from '@/components/section-tracker'
import VoyagerMembers from './members'
import { VoyagerHeader } from './voyager-header'
import { VoyagerFeed } from './voyager-feed'
export function VoyagerHub({ tab }: { tab: 'feed' | 'members' | 'logs' }) {
  const { user } = useAuth()
  if (tab === 'feed') return <VoyagerFeed />
  return <main className="main pilot-archive-page" data-route-scroll><SectionTracker section="voyagers" /><VoyagerHeader tab={tab} profile={Boolean(user.id)} />{tab === 'members' ? <VoyagerMembers /> : <VoyagerLogs embedded />}</main>
}
