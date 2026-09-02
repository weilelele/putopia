import type { Metadata } from 'next'
import { listAdminDeviceBatchRecords } from '@/lib/device-batch-repository'
import { NewBatchForm } from './new-batch-form'
import styles from './new-batch.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Create Batch Draft — Multiverse Collective',
}

export default async function NewDeviceBatchPage() {
  const records = await listAdminDeviceBatchRecords()
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span>DEVICE ARCHIVE</span>
          <h1>Create Batch draft</h1>
        </div>
        <p>
          Register the Batch identity first. Status, stock, Packs, and live updates
          are completed in the configuration workspace.
        </p>
      </header>

      <NewBatchForm
        reservedSlugs={records.map((record) => record.batch.slug)}
      />
    </div>
  )
}
