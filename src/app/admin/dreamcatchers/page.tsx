import { listAdminDreamcatchers } from '@/lib/dreamcatcher-admin'
import { DreamcatcherManager } from './dreamcatcher-manager'

export const dynamic = 'force-dynamic'

export default async function DreamcatchersAdminPage() {
  return <DreamcatcherManager records={await listAdminDreamcatchers()} />
}
