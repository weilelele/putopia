import type { Metadata } from 'next'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { listAdminDeviceBatchRecords } from '@/lib/device-batch-repository'
import { BatchConfigEditor } from './batch-config-editor'
import styles from './batch-config-editor.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Batch Configuration — Multiverse Collective',
}

export default async function DeviceBatchAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string | string[] }>
}) {
  const { batch } = await searchParams
  const records = (await listAdminDeviceBatchRecords()).filter(
    (record) => record.publicationStatus !== 'archived',
  )
  const requestedSlug = typeof batch === 'string' ? batch : undefined
  const initialSlug = records.some((record) => record.batch.slug === requestedSlug)
    ? requestedSlug
    : undefined

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span>DEVICE ARCHIVE</span>
          <h1>Batch configuration</h1>
        </div>
        <p>
          Manual publishing is active. Update status, Packs, and field reports, save
          a private draft, then use PUBLISH LIVE when ready. Dates never publish content automatically.
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
