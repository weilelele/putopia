import { ArchiveLinkButton } from '@/components/archive-link-button'
import { OfflineTracker } from './offline-tracker'
import { RetryLink } from './retry-link'
export default function OfflinePage() {
  return <main className="main"><OfflineTracker /><section className="archive-card" style={{ maxWidth: 560, margin: 'auto' }}><h1>YOU’RE OFFLINE</h1><p>This web page needs a connection to load current content. In the iOS app, previously saved content remains available in read-only mode.</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}><RetryLink /><ArchiveLinkButton href="/console">DASHBOARD</ArchiveLinkButton></div></section></main>
}
