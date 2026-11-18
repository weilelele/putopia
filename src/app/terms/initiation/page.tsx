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
        <p className={styles.updated}>Updated November 18, 2026</p>

        <section>
          <h2>YOUR INITIATION</h2>
          <p>Voyager Membership is $12 for member access with no physical Packs or Console claim. Initial Voyager Pack is {initiationPriceLabel('initial')} for the same member access and Packs 1–2. Complete Voyager Pack is {initiationPriceLabel('standard')} for the same member access and all four Packs, including the Multiverse Console. Each option is a one-time payment with no recurring membership fee.</p>
          <p>Voyager access includes Mission Briefings, Parallax Array observation submissions, Classified Intel, member votes and Feed participation. Accepting and carrying out missions requires a Multiverse Console bound to your account. Member access begins once payment is confirmed.</p>
          <p>Each member occupies one of the 100 S26 seats. Upgrading keeps the same seat. An active $12 Membership payment is credited toward either Pack option, making the additional payment $26 for Initial or $476 for Complete.</p>
          <p>All Initial Pack members, including historical $12 Initial Pack buyers, can add Console + Pack 4 for {initiationPriceLabel('legacy_upgrade')}. Initial plus this upgrade totals $498. Choosing Complete directly totals $488 and saves $10. Historical $12 Initial Pack orders include their original Packs and are distinct from the new $12 Membership. Completed historical payments retain their original amount and terms.</p>
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
          <p>Initial purchases and Membership-to-Initial upgrades include Packages 1–2. Complete purchases and direct Membership-to-Complete upgrades include all four. Initial-to-Complete upgrades add Packages 3–4. The $12 Membership has no physical deliveries. These are planned dispatch months. Tracking information becomes available after dispatch.</p>
          <p>Complete Pack owners and members who have upgraded to include the Console can claim it on the Devices page. Choose any published batch with available capacity. Confirming a claim reserves your selected batch. Console Holder access begins after you receive the device and bind it to your account. To request a change before shipment, contact architect@multiverseco.org. Changes are subject to availability. Once shipped, the batch cannot be changed. The Console is Package 3, a single delivery. If no device is available, you will need to wait for availability.</p>
        </section>
        <section>
          <h2>DELIVERY DETAILS</h2>
          <p>The $12 Membership requires no delivery address. When purchasing or upgrading to physical Packs, enter or confirm your delivery details at checkout. We use them for your Packs and Console claim. Tracking will be available after dispatch.</p>
          <p>For orders containing physical Packs, your card is authorized first. We collect payment after verifying that your delivery address is in a supported region. For an unsupported address, we cancel the authorization. Your bank may show a temporary hold until it releases the funds.</p>
          <p>Existing Initial Pack members who do not complete Initiation still receive their first two packs. We will confirm their delivery details separately.</p>
          <p>Delivery is limited to the contiguous United States: the 48 contiguous states and Washington, DC. Alaska, Hawaii, US territories and military addresses are excluded. Shipping and applicable taxes are included in each displayed bundle or upgrade total.</p>
        </section>
        <section>
          <h2>ADDRESS CHANGES &amp; DELAYS</h2>
          <p>Contact us as soon as possible to change the address for unshipped packs. Once a carrier has received a parcel, an address change may no longer be possible.</p>
          <p>If dispatch is delayed, we will share an updated estimate and offer the choice to accept the delay or cancel the affected unshipped items for a refund.</p>
        </section>
        <section id="refunds">
          <h2>CANCELLATIONS &amp; REFUNDS</h2>
          <p>You can request a refund of your $12 Voyager Membership payment. Refunding that payment cancels the Membership, closes its member access and releases its S26 seat.</p>
          <p>If you keep the original $12 Membership payment and refund only an upgrade payment, your Voyager Membership and S26 seat stay active. This applies to both full and partial refunds of the upgrade payment. Refunded or canceled Packs will not be dispatched. Console claim access depends on the remaining valid, unrefunded purchase.</p>
          <p>Unshipped Packs are refundable to the original payment method. A Pack is fulfilled when it is handed to the carrier. For cancellation refunds, each physical Pack payment is divided equally among the Packs purchased in that payment.</p>
          <ul>
            <li>The $26 Membership-to-Initial upgrade covers Packs 1–2 at $13 per Pack.</li>
            <li>The $476 direct Membership-to-Complete upgrade covers four Packs at $119 per Pack.</li>
            <li>A direct Initial purchase covers two Packs at ${INITIATION_PRICES.initial.amount / 200} per Pack.</li>
            <li>A direct Complete purchase covers four Packs at ${INITIATION_PRICES.standard.amount / 400} per Pack.</li>
            <li>The {initiationPriceLabel('legacy_upgrade')} Initial-to-Complete upgrade covers Console and Pack 4 at ${INITIATION_PRICES.legacy_upgrade.amount / 200} per Pack.</li>
          </ul>
          <p>The original $12 Membership payment is separate from all upgrade refund calculations. If you upgrade through Initial to Complete, each upgrade payment is allocated separately to the Packs it added.</p>
          <p>For direct Initial or Complete purchases, partial refunds retain Voyager member access. A full refund revokes the benefits of that purchase. Refunding an Initial-to-Complete upgrade preserves the original Initial Pack payment and its independently valid benefits.</p>
          <p>These allocations apply to cancellation refunds. Historical completed payments retain their agreed refund terms. Requests involving damaged, incorrect, incomplete or missing Packs are handled separately from cancellation refunds.</p>
        </section>
        <section>
          <h2>HELP WITH A PACK</h2>
          <p>For a damaged, incorrect, incomplete or missing delivery, send your order reference and a description, with photos or tracking details where available. We will investigate and arrange a replacement, reshipment or refund. We cover the necessary replacement or return shipping for problems caused by us or during delivery.</p>
          <p>Contact <a href="mailto:architect@multiverseco.org">architect@multiverseco.org</a>. These arrangements do not limit rights that cannot be excluded under applicable consumer law.</p>
        </section>
      </article>
    </main>
  )
}
