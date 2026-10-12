'use client'

import { useState } from 'react'
import { ChevronRight, Mail } from 'lucide-react'
import { trackDevice } from '@/lib/device-analytics'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveSheet } from '@/components/archive-sheet'
import { DEVICE_SUPPORT_EMAIL, KYOTO_PURCHASE_TERMS } from '@/lib/device-purchase-terms'
import styles from './device-purchase-terms.module.css'

const supportHref = `mailto:${DEVICE_SUPPORT_EMAIL}?subject=${encodeURIComponent('Kyoto One order support')}&body=${encodeURIComponent('Order number (optional):\n\nHow can we help?')}`

export function DevicePurchaseTerms({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  if (slug !== 'kyoto-one') return null

  return (
    <section className={styles.purchaseInfo} data-compact={compact} aria-label="Historical order terms">
      <p className={styles.summary}><strong>Original Kyoto One order terms</strong></p>
      <ArchiveButton className={styles.detailsButton} onClick={() => { trackDevice('device_purchase_details_opened', { batch_slug: slug, location: 'order_record' }); setOpen(true) }} variant="ghost">
        <span>ORIGINAL ORDER DETAILS</span><ChevronRight aria-hidden size={18} />
      </ArchiveButton>
      {open ? <ArchiveSheet open title="Original order terms" onClose={() => setOpen(false)}>
        <div className={styles.terms}>
          <p><strong>Shipping &amp; taxes included.</strong> One Console, three shipments. One payment of $520.</p>
          <p>{KYOTO_PURCHASE_TERMS.cancellation}</p>
          <p>{KYOTO_PURCHASE_TERMS.timing}</p>
          <a className={styles.supportButton} href={supportHref} onClick={() => trackDevice('device_order_support_clicked', { batch_slug: slug })}>
            <Mail aria-hidden size={18} /><span>CONTACT ORDER SUPPORT</span>
          </a>
        </div>
      </ArchiveSheet> : null}
    </section>
  )
}
