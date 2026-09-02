import type { ReactNode } from 'react'
import styles from './live-feed-placeholder.module.css'

/** Layout-only slot. OBS playback is intentionally excluded from this release. */
export function LiveFeedPlaceholder({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className={styles.frame}>
      <div className={styles.message}>
        <strong>LIVE FEED NOT CONNECTED</strong>
        <p>Live playback will be available here.</p>
      </div>
      <div className={styles.details}>{children}</div>
    </section>
  )
}
