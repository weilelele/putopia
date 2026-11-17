'use client'

import { useState, type ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import SmartImage from '@/components/smart-image'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveSheet } from '@/components/archive-sheet'
import { membershipAmountLabel as dollars, membershipOffers, type MembershipOwnership } from '@/lib/voyager-membership-offers'
import styles from './initiation.module.css'

export const membershipMarks = {
  logo: 'Logo',
  batch: 'Logo + S26',
  identity: 'Digital ID',
} as const

export type MembershipMarkVariant = keyof typeof membershipMarks
export type MembershipPreview = { mark: MembershipMarkVariant; ownership: MembershipOwnership }

export function MembershipMark({ mark }: { mark: MembershipMarkVariant }) {
  return <span className={`${styles.bundleCircle} ${styles.membershipMark}`} data-mark={mark} aria-hidden="true">
    <span className={styles.membershipMarkInner}>
      <SmartImage src="/assets/vi-icon.png" alt="" width={881} height={492} sizes="96px" />
      {mark === 'batch' && <span>S26</span>}
      {mark === 'identity' && <span>VOYAGER</span>}
    </span>
  </span>
}

export function MembershipPreviewPurchase({ preview, renderPackImages }: {
  preview: MembershipPreview
  renderPackImages: (bundle: 'initial' | 'standard') => ReactNode
}) {
  const { mark, ownership } = preview
  const offers = membershipOffers(ownership)
  const [target, setTarget] = useState(offers[0].target)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const selected = offers.find(offer => offer.target === target) ?? offers[0]
  const digital = selected.target === 'membership'

  return <div className={styles.join} id="membership-purchase-preview">
    <h2 className={styles.purchaseTitle}>{ownership === 'membership' ? 'Your Voyager membership.' : ownership === 'initial' ? 'Activate Packs 3–4.' : 'Choose how to join.'}</h2>
    <div className={styles.sharedBenefits}>
      {ownership === 'membership' ? <p><strong>Active · S26</strong> · $12 paid. Your payment is credited when you add Packs.</p>
        : ownership === 'initial' ? <p>Add the remaining Packs for $460.</p>
        : <p>All three options include Voyager membership.</p>}
    </div>
    <fieldset className={styles.bundleChoices}>
      <legend className="sr-only">{ownership === 'none' ? 'Choose a Voyager option' : 'Choose your upgrade'}</legend>
      {offers.map(offer => {
        const chosen = selected.target === offer.target
        return <label className={`${styles.bundleCard} ${chosen ? styles.bundleSelected : ''}`} key={offer.target}>
          <input type="radio" name="membership-offer" value={offer.target} checked={chosen}
            onChange={() => setTarget(offer.target)} aria-labelledby={`membership-name-${offer.target} membership-price-${offer.target}`}
            aria-describedby={`membership-detail-${offer.target}`} />
          <span className={styles.bundleCopy}>
            <span className={styles.bundleHeading}>
              <span id={`membership-name-${offer.target}`}>{offer.name}</span>
              <strong id={`membership-price-${offer.target}`}>{dollars(offer.amount)}</strong>
            </span>
            <span className={styles.bundleDetail} id={`membership-detail-${offer.target}`}>
              {offer.target === 'membership' ? 'Digital only · No physical packs'
                : offer.target === 'initial' ? 'Packs 1–2'
                  : ownership === 'initial' ? 'Console + Pack 4' : 'Packs 1–4 · Console included'}
            </span>
            {offer.credit > 0 && <span className={styles.bundleNote}>{dollars(offer.listAmount)} − {dollars(offer.credit)} already paid</span>}
          </span>
          {chosen && offer.target === 'membership' && <span className={styles.digitalOfferBenefits}>
            <MembershipMark mark={mark} />
            <span>Classified Intel, Voyager votes, Feed posting, Parallax Array submissions and mission briefings.</span>
          </span>}
          {chosen && ownership !== 'initial' && offer.target !== 'membership' && renderPackImages(offer.target)}
        </label>
      })}
    </fieldset>
    <div className={styles.purchaseTerms}>
      <p>One payment. No subscription.</p>
      <p>{digital ? 'No shipping address needed.' : 'Ships to the 48 contiguous US states and DC.'}</p>
    </div>
    <ArchiveButton className={styles.become} fullWidth onClick={() => setCheckoutOpen(true)}>
      {ownership === 'none' ? 'Continue' : 'Upgrade'} · {dollars(selected.amount)} <ArrowRight size={20} aria-hidden="true" />
    </ArchiveButton>
    <ArchiveSheet open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Shopify checkout preview">
      <p>{selected.name} · {dollars(selected.amount)} USD</p>
      {selected.credit > 0 && <p>Includes your {dollars(selected.credit)} membership credit.</p>}
      <p>{digital ? 'Digital membership only.' : 'This order includes physical Packs and requires a delivery address.'}</p>
      <p>Preview only. No payment is collected.</p>
    </ArchiveSheet>
  </div>
}
