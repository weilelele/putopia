'use client'

import { useState } from 'react'
import { ChevronRight, Mail } from 'lucide-react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveSheet } from '@/components/archive-sheet'
import { DEVICE_SUPPORT_EMAIL, KYOTO_PURCHASE_TERMS } from '@/lib/device-purchase-terms'
import styles from './device-purchase-terms.module.css'

const supportHref = `mailto:${DEVICE_SUPPORT_EMAIL}?subject=${encodeURIComponent('Kyoto One order support')}&body=${encodeURIComponent('Order number (optional):\n\nHow can we help?')}`

export function DevicePurchaseTerms({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  if (slug !== 'kyoto-one') return null

  return (
    <section className={styles.purchaseInfo} data-compact={compact} aria-label="Purchase information">
      <p className={styles.summary}><strong>Shipping &amp; taxes included</strong>{compact ? null : <span>Preorder</span>}</p>
      <ArchiveButton className={styles.detailsButton} onClick={() => setOpen(true)} variant="ghost">
        <span>{compact ? 'DETAILS' : 'PURCHASE DETAILS'}</span><ChevronRight aria-hidden size={18} />
      </ArchiveButton>
      {open ? <ArchiveSheet open title="Purchase details" onClose={() => setOpen(false)}>
        <div className={styles.terms}>
          <p><strong>Shipping &amp; taxes included.</strong> One Console, three shipments. One payment of $520.</p>
          <p>{KYOTO_PURCHASE_TERMS.cancellation}</p>
          <p>{KYOTO_PURCHASE_TERMS.timing}</p>
          <a className={styles.supportButton} href={supportHref}>
            <Mail aria-hidden size={18} /><span>CONTACT ORDER SUPPORT</span>
          </a>
        </div>
      </ArchiveSheet> : null}
    </section>
  )
}
