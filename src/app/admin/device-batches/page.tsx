import type { Metadata } from 'next'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { listAdminDeviceBatchRecords } from '@/lib/device-batch-repository'
import { BatchConfigEditor } from './batch-config-editor'
import styles from './batch-config-editor.module.css'

export const metadata: Metadata = {
  title: 'Batch Configuration — Multiverse Collective',
}

export default async function DeviceBatchAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string | string[] }>
}) {
  const { batch } = await searchParams
  const initialSlug = typeof batch === 'string' ? batch : undefined
  const records = await listAdminDeviceBatchRecords()

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span>DEVICE ARCHIVE</span>
          <h1>Batch configuration</h1>
        </div>
        <p>
          Update public status, claim stock, distribution packs, and the latest field
          report one section at a time.
        </p>
        <div className={styles.pageHeaderActions}>
          <ArchiveLinkButton href="/admin/device-batches/blueprints" variant="secondary">
            STORY LAB
          </ArchiveLinkButton>
          <ArchiveLinkButton href="/admin/device-batches/new">
            CREATE BATCH
          </ArchiveLinkButton>
        </div>
      </header>

      <BatchConfigEditor records={records} initialSlug={initialSlug} />
    </div>
  )
}
