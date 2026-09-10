import Link from 'next/link'
import type { ReactNode } from 'react'
import SmartImage from './smart-image'
import styles from './root-brand-header.module.css'
/** Primary mobile pages only; secondary routes keep their back/title header. */
export function RootBrandHeader({children}: {children?:ReactNode}) {
  return <div className={`archive-root-actions ${styles.header}${children ? '' : ` ${styles.brandOnly}`}`}>
    <Link href="/console" className={styles.brand} aria-label="Multiverse Collective · Dashboard">
      <SmartImage src="/assets/vi-icon.png" alt="" width={28} height={22} sizes="28px" />
      <SmartImage className={styles.wordmark} src="/assets/vi-wordmark.png" alt="Multiverse Collective" width={120} height={36} sizes="120px" />
    </Link>{children}
  </div>
}
