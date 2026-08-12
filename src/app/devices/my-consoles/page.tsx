import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, Clock3, Package } from 'lucide-react'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { DEVICE_BATCH_STATUS } from '@/lib/device-batches'
import { listPublicDeviceBatches } from '@/lib/device-batch-repository'
import { getMyDeviceConsoles } from '@/lib/actions/orders'
import { FollowedBatchList } from '../_components/followed-batch-list'
import styles from '../device-batches.module.css'

export const metadata: Metadata = {
  title: 'My Consoles — Multiverse Collective',
  description: 'Review claimed Consoles, followed batches, distribution packs, and delivery records.',
}

export const dynamic = 'force-dynamic'

export default async function MyConsolesPage() {
  const [batches, consoles] = await Promise.all([
    listPublicDeviceBatches(),
    getMyDeviceConsoles(),
  ])
  const records = consoles.flatMap((record) => {
    const batch = batches.find((candidate) => candidate.slug === record.order.device_batch_slug)
    return batch ? [{ batch, record }] : []
  })

  return (
    <main className={`main pilot-archive-page archive-collection-page ${styles.archivePage}`}>
      <ArchiveBrandHeader />

      <div className="top-bar">
        <div className="crumbs">
          DEVICE ARCHIVE <span>/</span> MY CONSOLES
        </div>
        <div className="right">
          <div className="item">
            CLAIMED <span className="val">{records.length}</span>
          </div>
        </div>
      </div>

      <ArchivePageHeader
        accent="CONSOLES"
        action={
          <Link className={styles.myConsolesLink} href="/devices">
            DEVICE ARCHIVE <ArrowRight aria-hidden size={14} />
          </Link>
        }
        title="MY"
      />

      <section className={styles.myConsolesSection}>
        <ArchiveSectionLabel>CLAIMED BATCHES</ArchiveSectionLabel>
        <div className={styles.ownedBatchList}>
          {records.map(({ batch, record }) => {
            const displayStages = record.packs.length
              ? record.packs
              : batch.distributionStages.map((stage, index) => ({
                  expected_window: stage.window,
                  label: stage.label,
                  stage_id: stage.id,
                  stage_position: index + 1,
                  status: 'planned',
                }))
            const firstOpenStage = displayStages.findIndex((stage) => stage.status !== 'delivered')

            return (
              <article className={styles.ownedBatchCard} key={batch.slug}>
                <div className={styles.ownedBatchHeader}>
                  <Link
                    aria-label={`Open ${batch.name}`}
                    className={styles.ownedBatchImage}
                    href={`/devices/batches/${batch.slug}`}
                  >
                    <Image
                      alt={batch.imageAlt}
                      fill
                      sizes="(max-width: 639px) 100vw, 16rem"
                      src={batch.image}
                      style={{ objectFit: batch.imageFit ?? 'cover' }}
                    />
                  </Link>
                  <div className={styles.ownedBatchIdentity}>
                    <span>{DEVICE_BATCH_STATUS[batch.status].label}</span>
                    <h2>{batch.name}</h2>
                    <p>{record.unitCode}</p>
                    <Link href={`/devices/batches/${batch.slug}`}>
                      OPEN BATCH <ArrowRight aria-hidden size={14} />
                    </Link>
                  </div>
                </div>

                <div className={styles.ownedRecordFacts}>
                  <div>
                    <span>CLAIMED</span>
                    <strong>{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(record.order.paid_at ?? record.order.created_at))}</strong>
                  </div>
                  <div>
                    <span>ORDER</span>
                    <strong>{`MC-${record.order.device_batch_code ?? 'DEVICE'}-${record.order.id.slice(0, 8).toUpperCase()}`}</strong>
                  </div>
                  <div>
                    <span>FINAL DISPATCH</span>
                    <strong>{batch.estimatedCompletion.replace('Estimated final dispatch: ', '')}</strong>
                  </div>
                </div>

                <div className={styles.ownedTimeline}>
                  <div className={styles.ownedTimelineHeading}>
                    <Package aria-hidden size={16} />
                    DISTRIBUTION RECORD
                  </div>
                  <ol>
                    {displayStages.map((stage, index) => {
                      const completed = stage.status === 'delivered'
                      const isNext = !completed && index === firstOpenStage
                      return (
                        <li
                          className={
                            completed
                              ? styles.ownedStageComplete
                              : isNext
                                ? styles.ownedStageNext
                                : ''
                          }
                          key={stage.stage_id}
                        >
                          <span className={styles.ownedStageMarker}>
                            {completed ? (
                              <Check aria-hidden size={14} />
                            ) : (
                              <Clock3 aria-hidden size={14} />
                            )}
                          </span>
                          <span>
                            <strong>{stage.label}</strong>
                            <small>{stage.expected_window}</small>
                          </span>
                          <em>
                            {completed ? 'DELIVERED' : stage.status.toUpperCase()}
                          </em>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              </article>
            )
          })}
          {records.length === 0 ? (
            <div className={styles.emptyArchive}>
              No payment-confirmed Console is assigned to this account yet.
            </div>
          ) : null}
        </div>
      </section>

      <section className={styles.myConsolesSection}>
        <div className={styles.registryHeading}>
          <ArchiveSectionLabel>FOLLOWING</ArchiveSectionLabel>
          <span>UPDATES ONLY · NO UNIT RESERVED</span>
        </div>
        <FollowedBatchList batches={batches} />
      </section>
    </main>
  )
}
