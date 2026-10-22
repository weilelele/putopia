import { initiationPriceLabel, INITIATION_PRICES } from '@/lib/initiation-pricing'
import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../../privacy/privacy.module.css'

export const metadata: Metadata = {
  title: 'Initiation delivery & aftercare — Multiverse Collective',
  robots: { index: false, follow: false },
}

export default function InitiationTermsPage() {
  return (
    <main className="main">
      <article className={styles.doc}>
        <Link href="/voyager-initiation">← VOYAGER INITIATION</Link>
        <h1>DELIVERY &amp; AFTERCARE</h1>
        <p className={styles.updated}>Updated October 22, 2026</p>

        <section>
          <h2>YOUR INITIATION</h2>
          <p>Initial Voyager Pack is {initiationPriceLabel('initial')} for member access and Packs 1–2. Complete Voyager Pack is {initiationPriceLabel('standard')} for the same member access and all four Packs. All Initial Pack members, including historical $12 buyers, can add Console + Pack 4 for {initiationPriceLabel('legacy_upgrade')}. There is no recurring membership fee.</p>
          <p>Initial Pack members keep access to classified Intel, member votes, Feed participation and the first two packs. Complete and the upgrade include Console claim access and Pack 4. At current prices, Initial plus the upgrade totals $498; Complete saves $10. Upgrade pricing is a fixed additional payment, not a credit of the earlier Initial price. Completed historical payments keep their original amount and terms; no difference is charged retroactively.</p>
        </section>
        <section>
          <h2>S26 PACKS</h2>
          <ul>
            <li>Package 1 — October 2026</li>
            <li>Package 2 · Antenna for Multiverse Console — November 2026</li>
            <li>Package 3 · Multiverse Console — December 2026</li>
            <li>Package 4 — January 2027</li>
          </ul>
          <p>The Antenna is a collectible emblem of the Collective and a decorative receiving accessory. It must be installed on a Multiverse Console to receive signals. The {initiationPriceLabel('initial')} Initial Voyager Pack does not include the Console. Antenna images show design studies; final appearance and quantity are to be confirmed.</p>
          <p>Initial purchases include Packages 1–2; upgrades add Packages 3–4; Complete includes all four. These are scheduled dispatch months, rather than arrival dates. Existing Initial Pack members’ first two packs follow this same schedule and have not shipped yet.</p>
          <p>Claim your Console on the Devices page after completing Initiation. S26 does not assign a device batch: choose any published batch with available capacity. Confirming a claim reserves your selected batch. Console Holder access begins after you receive the device and bind it to your account. To request a change before shipment, contact voyagers@multiverseco.org; changes are subject to availability. Once shipped, the batch cannot be changed. The Console is Package 3, a single delivery. If no device is available, you will need to wait for availability.</p>
        </section>
        <section>
          <h2>DELIVERY DETAILS</h2>
          <p>Enter or confirm your delivery details in Stripe when buying either bundle or the upgrade. We use them for your packs and Console claim. Tracking will be available after dispatch.</p>
          <p>Your card is authorized first. We collect payment only after verifying that your delivery address is in a supported region. For an unsupported address, we cancel the authorization. Your bank may show a temporary hold until it releases the funds.</p>
          <p>Existing Initial Pack members who do not complete Initiation still receive their first two packs. We will confirm their delivery details separately.</p>
          <p>Delivery is limited to the contiguous United States: the 48 contiguous states and Washington, DC. Alaska, Hawaii, US territories and military addresses are excluded. Shipping and applicable taxes are included in each displayed bundle or upgrade total.</p>
        </section>
        <section>
          <h2>ADDRESS CHANGES &amp; DELAYS</h2>
          <p>Contact us as soon as possible to change the address for unshipped packs. Once a carrier has received a parcel, an address change may no longer be possible.</p>
          <p>If dispatch is delayed, we will share an updated estimate and offer the choice to accept the delay or cancel the affected unshipped items for a refund.</p>
        </section>
        <section>
          <h2>CANCELLATIONS &amp; REFUNDS</h2>
          <p>For cancellation refunds on new purchases, each payment is allocated equally across the packs purchased in that payment: Initial covers two packs at ${INITIATION_PRICES.initial.amount / 200} each; Complete covers four packs at ${INITIATION_PRICES.standard.amount / 400} each; the upgrade covers Console and Pack 4 at ${INITIATION_PRICES.legacy_upgrade.amount / 200} each. A pack is fulfilled when it is handed to the carrier. Unshipped packs are refundable to the original payment method. This allocation is for refund calculation, not the separate retail price of each pack.</p>
          <p>Partial refunds retain classified Intel and member voting access. A full refund revokes the benefits of this Initiation payment. Refunded or canceled packs will not be dispatched.</p>
          <p>An upgrade refund does not cancel your original Initial Pack payment or its independently valid benefits. Your original $12 or $38 payment is not included in the upgrade refund calculation. Historical completed payments retain their agreed refund terms. Requests involving damaged, incorrect, incomplete or missing packs are handled separately from cancellation refunds.</p>
        </section>
        <section>
          <h2>HELP WITH A PACK</h2>
          <p>For a damaged, incorrect, incomplete or missing delivery, send your order reference and a description, with photos or tracking details where available. We will investigate and arrange a replacement, reshipment or refund. We cover the necessary replacement or return shipping for problems caused by us or during delivery.</p>
          <p>Contact <a href="mailto:voyagers@multiverseco.org">voyagers@multiverseco.org</a>. These arrangements do not limit rights that cannot be excluded under applicable consumer law.</p>
        </section>
      </article>
    </main>
  )
}
