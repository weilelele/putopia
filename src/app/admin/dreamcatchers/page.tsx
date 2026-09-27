import { ArchiveLinkButton } from '@/components/archive-link-button'
import { listAdminDreamcatchers } from '@/lib/dreamcatcher-admin'
import { DreamcatcherManager } from './dreamcatcher-manager'

export const dynamic = 'force-dynamic'

export default async function DreamcatchersAdminPage() {
  return <><ArchiveLinkButton href="/admin/dreamcatchers/rounds" variant="ghost">ROUND OPERATIONS</ArchiveLinkButton><DreamcatcherManager records={await listAdminDreamcatchers()} /></>
}
