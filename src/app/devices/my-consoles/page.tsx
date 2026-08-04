import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, Clock3, Package } from 'lucide-react'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { OWNED_BATCH_RECORDS } from '@/lib/batch-participation'
import { DEVICE_BATCH_STATUS } from '@/lib/device-batches'
import { listPublicDeviceBatches } from '@/lib/device-batch-repository'
import { FollowedBatchList } from '../_components/followed-batch-list'
import styles from '../device-batches.module.css'

export const metadata: Metadata = {
  title: 'My Consoles — Multiverse Collective',
  description: 'Review claimed Consoles, followed batches, distribution packs, and delivery records.',
}

export const dynamic = 'force-dynamic'

export default async function MyConsolesPage() {
  const batches = await listPublicDeviceBatches()
  const records = OWNED_BATCH_RECORDS.flatMap((record) => {
    const batch = batches.find((candidate) => candidate.slug === record.slug)
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
            const firstOpenStage = batch.distributionStages.findIndex(
              (stage) => stage.status !== 'completed',
            )

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
                    <p>{record.unit}</p>
                    <Link href={`/devices/batches/${batch.slug}`}>
                      OPEN BATCH <ArrowRight aria-hidden size={14} />
                    </Link>
                  </div>
                </div>

                <div className={styles.ownedRecordFacts}>
                  <div>
                    <span>CLAIMED</span>
                    <strong>{record.claimedAt}</strong>
                  </div>
                  <div>
                    <span>ORDER</span>
                    <strong>{record.orderCode}</strong>
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
                    {batch.distributionStages.map((stage, index) => {
                      const isNext = index === firstOpenStage
                      return (
                        <li
                          className={
                            stage.status === 'completed'
                              ? styles.ownedStageComplete
                              : isNext
                                ? styles.ownedStageNext
                                : ''
                          }
                          key={stage.id}
                        >
                          <span className={styles.ownedStageMarker}>
                            {stage.status === 'completed' ? (
                              <Check aria-hidden size={14} />
                            ) : (
                              <Clock3 aria-hidden size={14} />
                            )}
                          </span>
                          <span>
                            <strong>{stage.label}</strong>
                            <small>{stage.window}</small>
                          </span>
                          <em>
                            {stage.status === 'completed'
                              ? 'DELIVERED'
                              : isNext
                                ? 'NEXT'
                                : 'PLANNED'}
                          </em>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              </article>
            )
          })}
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
