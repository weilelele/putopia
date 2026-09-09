import SmartImage from './smart-image'
import type { ReactNode } from 'react'
import styles from './live-feed-placeholder.module.css'

/** Layout-only slot. OBS playback is intentionally excluded from this release. */
export function LiveFeedPlaceholder({ label, children, image, imageAlt = 'Batch image' }: { label: string; children: ReactNode; image?: string; imageAlt?: string }) {
  return (
    <section aria-label={label} className={styles.frame}>
      {image && <SmartImage src={image} alt={imageAlt} width={640} height={400} sizes="(min-width:768px) 720px, 100vw" className={styles.image} />}
      <div className={image ? styles.caption : styles.message}>
        <strong>LIVE FEED NOT CONNECTED</strong>
        {!image && <p>Live playback will be available here.</p>}
      </div>
      <div className={styles.details}>{children}</div>
    </section>
  )
}
