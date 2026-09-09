import { DashboardStats } from '@/components/dashboard-stats'
import { ArchivePageHeader } from '@/components/archive-page-header'
export default function ConsoleLoading() {
  return <main className="main archive-console-page" aria-busy="true" aria-label="Loading Dashboard"><ArchivePageHeader hideTitle title="Dashboard" /><DashboardStats stats={null} /><h2>Updates</h2><p role="status">Loading the latest updates…</p><div className="archive-route-skeleton" style={{ height: 80, marginBlock: 16 }} /><h2>Events</h2><p>Checking available events…</p></main>
}
