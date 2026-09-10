import { ArchiveLinkButton } from '@/components/archive-link-button'
import { OfflineTracker } from './offline-tracker'
export default function OfflinePage() {
  return <main className="main"><OfflineTracker /><section className="archive-card" style={{ maxWidth: 560, margin: 'auto' }}><h1>YOU’RE OFFLINE</h1><p>This web page needs a connection to load current content. In the iOS app, previously saved content remains available in read-only mode.</p><ArchiveLinkButton href="/console">Retry connection</ArchiveLinkButton></section></main>
}
