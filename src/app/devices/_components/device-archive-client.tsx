'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MapPin, Package } from 'lucide-react'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { SectionTracker } from '@/components/section-tracker'
import {
  DEVICE_BATCH_STATUS,
  type DeviceBatch,
  type DeviceBatchStatus,
} from '@/lib/device-batches'
import { FollowBatchButton } from './batch-actions'
import { useFollowedBatchSlugs } from './use-followed-batches'
import styles from '../device-batches.module.css'

type BatchFilter = 'all' | 'following' | DeviceBatchStatus

const FILTERS: { id: BatchFilter; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'following', label: 'FOLLOWING' },
  { id: 'survey', label: 'SURVEY' },
  { id: 'claim_open', label: 'CLAIM OPEN' },
  { id: 'distribution', label: 'DISTRIBUTING' },
  { id: 'active', label: 'ACTIVE' },
]

const STATUS_CLASS: Record<DeviceBatchStatus, string> = {
  survey: styles.statusSurvey,
  claim_open: styles.statusClaim,
  distribution: styles.statusDistribution,
  active: styles.statusActive,
}

export function DeviceArchiveClient({ batches }: { batches: DeviceBatch[] }) {
  const [filter, setFilter] = useState<BatchFilter>('all')
  const followedBatchSlugs = useFollowedBatchSlugs()
  const visibleBatches =
    filter === 'all'
      ? batches
      : filter === 'following'
        ? batches.filter((batch) => followedBatchSlugs.includes(batch.slug))
        : batches.filter((batch) => batch.status === filter)
  const featuredBatch =
    batches.find((batch) => batch.status === 'claim_open') ??
    batches.find((batch) => batch.status === 'survey') ??
    batches[0]

  return (
    <main className={`main pilot-archive-page archive-collection-page ${styles.archivePage}`}>
      <SectionTracker section="devices" />
      <ArchiveBrandHeader />

      <div className="top-bar">
        <div className="crumbs">
          PC://CONSOLE <span>/</span> DEVICE ARCHIVE
        </div>
        <div className="right">
          <div className="item">
            BATCHES <span className="val">{batches.length}</span>
          </div>
        </div>
      </div>

      <ArchivePageHeader
        accent="ARCHIVE"
        action={
          <Link className={styles.myConsolesLink} href="/devices/my-consoles">
            <Package aria-hidden size={15} /> MY CONSOLES
          </Link>
        }
        title="DEVICE"
      />

      {featuredBatch && (
        <section className={styles.featuredSection}>
          <ArchiveSectionLabel>FEATURED BATCH</ArchiveSectionLabel>
          <div className={styles.featuredCard}>
            <Link
              aria-label={`Open ${featuredBatch.name}`}
              className={styles.featuredMedia}
              href={`/devices/batches/${featuredBatch.slug}`}
            >
              <Image
                alt={featuredBatch.imageAlt}
                fill
                loading="eager"
                sizes="(max-width: 767px) 100vw, 68vw"
                src={featuredBatch.image}
                style={{ objectFit: featuredBatch.imageFit ?? 'cover' }}
              />
            </Link>

            <div className={styles.featuredContent}>
              <div className={styles.cardTopline}>
                <span className={`${styles.statusPill} ${STATUS_CLASS[featuredBatch.status]}`}>
                  {DEVICE_BATCH_STATUS[featuredBatch.status].label}
                </span>
                <span className={styles.updatedAt}>UPDATED {featuredBatch.updatedAt.toUpperCase()}</span>
              </div>

              <div>
                <div className={styles.eyebrow}>{featuredBatch.code}</div>
                <h2 className={styles.featuredTitle}>{featuredBatch.name}</h2>
                <div className={styles.location}>
                  <MapPin aria-hidden size={14} />
                  {featuredBatch.location}
                </div>
              </div>

              <p className={styles.featuredSummary}>{featuredBatch.statusLine}</p>

              <div className={styles.featuredActions}>
                <Link
                  className="archive-button archive-button--primary"
                  href={`/devices/batches/${featuredBatch.slug}`}
                >
                  OPEN BATCH RECORD <ArrowRight aria-hidden size={15} />
                </Link>
                <FollowBatchButton
                  batchName={featuredBatch.name}
                  compact
                  slug={featuredBatch.slug}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      <section id="batch-registry">
        <div className={styles.registryHeading}>
          <ArchiveSectionLabel>BATCH REGISTRY</ArchiveSectionLabel>
          <span>{visibleBatches.length} RECORDS</span>
        </div>

        <div aria-label="Filter device batches" className={styles.filterRail} role="group">
          {FILTERS.map((item) => (
            <button
              aria-pressed={filter === item.id}
              className={filter === item.id ? styles.filterActive : ''}
              key={item.id}
              onClick={() => setFilter(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        {visibleBatches.length > 0 ? (
          <div className={styles.batchGrid}>
            {visibleBatches.map((batch) => (
              <article className={styles.batchCard} key={batch.slug}>
                <Link
                  aria-label={`Open ${batch.name}`}
                  className={styles.batchCardLink}
                  href={`/devices/batches/${batch.slug}`}
                />

                <div className={styles.batchMedia}>
                <Image
                  alt={batch.imageAlt}
                  fill
                  sizes="(max-width: 767px) 100vw, (max-width: 1100px) 50vw, 33vw"
                  src={batch.image}
                  style={{ objectFit: batch.imageFit ?? 'cover' }}
                />
                </div>

                <div className={styles.batchCardBody}>
                  <div className={styles.cardTopline}>
                    <span className={`${styles.statusPill} ${STATUS_CLASS[batch.status]}`}>
                      {DEVICE_BATCH_STATUS[batch.status].shortLabel}
                    </span>
                    <span className={styles.updatedAt}>{batch.updatedAt.toUpperCase()}</span>
                  </div>

                  <div className={styles.batchTitle}>
                    <span className={styles.eyebrow}>{batch.code}</span>
                    <h2>{batch.name}</h2>
                  </div>

                  <div className={styles.location}>
                    <MapPin aria-hidden size={14} />
                    {batch.location}
                  </div>

                  <div className={styles.cardActions}>
                    <FollowBatchButton batchName={batch.name} compact slug={batch.slug} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyRegistry}>
            <strong>NO FOLLOWED BATCHES</strong>
            <span>Follow a batch to keep its major updates in one place.</span>
          </div>
        )}
      </section>

    </main>
  )
}
