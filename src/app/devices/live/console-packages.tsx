'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveSheet } from '@/components/archive-sheet'
import type { DeviceBatch, DeviceBatchMedia, DistributionStage } from '@/lib/device-batches'
import styles from './console-packages.module.css'

function packageImage(batch: DeviceBatch, stage: DistributionStage): DeviceBatchMedia | undefined {
  const published = stage.media?.find(media => media.kind === 'image')
  if (published) return published
  if (stage.id === 'initial-voyager-pack') return {
    kind: 'image', src: '/voyager-pack/pack-email.png',
    alt: 'Voyager badge and welcome letter presentation on a workbench',
    caption: 'Initial Voyager Pack · presentation from the Collective archive',
  }
  if (batch.slug === 'kyoto-one' && stage.id === 'components-pack') return {
    kind: 'image', src: '/presentation/antenna-worlds/helix-desert.png',
    alt: 'Concept illustration of a helical antenna on a Console',
    caption: 'Antenna concept illustration · not a confirmed package item',
  }
  if (stage.id === 'console') return {
    kind: 'image', src: batch.image, alt: batch.imageAlt, caption: 'Console batch reference',
  }
}

export function ConsolePackages({ batch }: { batch: DeviceBatch }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = () => {
    setOpen(false)
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }))
  }
  const count = batch.distributionStages.length
  if (!count) return null
  return <>
    <div className={styles.overview}>
      <h3>{count === 3 ? 'THREE PACKAGES.' : `${count} ${count === 1 ? 'PACKAGE' : 'PACKAGES'}.`}</h3>
      <p>Unfold the experience, step by step.</p>
      <ArchiveButton ref={trigger} variant="ghost" className={styles.explore} onClick={() => setOpen(true)} aria-haspopup="dialog">
        EXPLORE THE PACKAGES <ArrowRight aria-hidden size={20} />
      </ArchiveButton>
    </div>
    {open && <ArchiveSheet open title="Explore the packages" onClose={close}>
      <p className={styles.intro}>{batch.name} · Unfold the experience, step by step.</p>
      <ol className={styles.packages}>
        {batch.distributionStages.map((stage, index) => {
          const media = packageImage(batch, stage)
          return <li key={stage.id} className={styles.package}>
            <header><span>PACKAGE {String(index + 1).padStart(2, '0')}</span><h3>{stage.label}</h3></header>
            {media && <figure><div className={`${styles.image} ${stage.id === 'initial-voyager-pack' ? styles.welcomeImage : ''}`}><Image src={media.src} alt={media.alt} fill sizes="(max-width: 560px) calc(100vw - 32px), 526px" /></div><figcaption>{media.caption}</figcaption></figure>}
            <p>{stage.summary}</p>
            <ul className={styles.contents}>{stage.contents.map(item => <li key={item}>{item}</li>)}</ul>
            <div className={styles.timing}><span>{stage.status.toUpperCase()}</span><p>{stage.window}</p></div>
          </li>
        })}
      </ol>
      <ArchiveButton variant="secondary" onClick={close}>BACK TO CLAIM</ArchiveButton>
    </ArchiveSheet>}
  </>
}
