'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Bell, MapPin } from 'lucide-react'
import { DEVICE_BATCH_STATUS, type DeviceBatch } from '@/lib/device-batches'
import { FollowBatchButton } from './batch-actions'
import { useFollowedBatchSlugs } from './use-followed-batches'
import styles from '../device-batches.module.css'

export function FollowedBatchList({ batches }: { batches: DeviceBatch[] }) {
  const followedBatchSlugs = useFollowedBatchSlugs()
  const followedBatches = batches.filter((batch) => followedBatchSlugs.includes(batch.slug))

  if (followedBatches.length === 0) {
    return (
      <div className={styles.followingEmpty}>
        <Bell aria-hidden size={18} />
        <div>
          <strong>NO FOLLOWED BATCHES</strong>
          <span>Follow an active recovery to collect its major updates here.</span>
        </div>
        <Link href="/devices">
          BROWSE BATCHES <ArrowRight aria-hidden size={14} />
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.followedBatchGrid}>
      {followedBatches.map((batch) => (
        <article className={styles.followedBatchCard} key={batch.slug}>
          <Link
            aria-label={`Open ${batch.name}`}
            className={styles.followedBatchImage}
            href={`/devices/batches/${batch.slug}`}
          >
            <Image
              alt={batch.imageAlt}
              fill
              sizes="(max-width: 639px) 7rem, 9rem"
              src={batch.image}
              style={{ objectFit: batch.imageFit ?? 'cover' }}
            />
          </Link>
          <div className={styles.followedBatchBody}>
            <span>{DEVICE_BATCH_STATUS[batch.status].shortLabel}</span>
            <h3>{batch.name}</h3>
            <p>
              <MapPin aria-hidden size={13} /> {batch.location}
            </p>
            <Link href={`/devices/batches/${batch.slug}`}>
              OPEN RECORD <ArrowRight aria-hidden size={14} />
            </Link>
          </div>
          <FollowBatchButton batchName={batch.name} compact slug={batch.slug} />
        </article>
      ))}
    </div>
  )
}
