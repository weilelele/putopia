import { DEVICE_SUPPORT_EMAIL, KYOTO_PURCHASE_TERMS } from '@/lib/device-purchase-terms'
import styles from './device-purchase-terms.module.css'

export function DevicePurchaseTerms({ slug }: { slug: string }) {
  if (slug !== 'kyoto-one') return null

  return (
    <section className={styles.terms} aria-label="Purchase information">
      <p><strong>Shipping &amp; taxes included.</strong> One Console, three shipments. One payment of $520.</p>
      <p>{KYOTO_PURCHASE_TERMS.cancellation}</p>
      <p>{KYOTO_PURCHASE_TERMS.timing}</p>
      <a href={`mailto:${DEVICE_SUPPORT_EMAIL}?subject=Kyoto%20One%20order%20support`}>Order or device support: {DEVICE_SUPPORT_EMAIL}</a>
      <span>Include your order number if you have one.</span>
    </section>
  )
}
