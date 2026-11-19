'use client'

import { useId, useState, type ReactNode, type RefObject } from 'react'
import { ArrowRight } from 'lucide-react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveSheet } from '@/components/archive-sheet'
import { membershipAmountLabel as dollars, membershipOffers, type MembershipOwnership, type MembershipTarget } from '@/lib/voyager-membership-offers'
import styles from './initiation.module.css'

export type MembershipPreview = { ownership: MembershipOwnership }

export function MembershipPurchase({ preview, renderOfferImages, initialTarget, onCheckout, onSelect, loading = false, disabled = false, error, reason, priceRef, errorRef }: {
  preview: MembershipPreview
  renderOfferImages: (bundle: MembershipTarget) => ReactNode
  priceRef?: RefObject<HTMLElement | null>
  errorRef?: RefObject<HTMLParagraphElement | null>
  initialTarget?: MembershipTarget
  onCheckout?: (target: MembershipTarget) => void
  onSelect?: (target: MembershipTarget) => void
  loading?: boolean
  disabled?: boolean
  error?: string
  reason?: string | null
}) {
  const controlId = useId()
  const { ownership } = preview
  const offers = membershipOffers(ownership)
  const defaultOffer = offers.find(offer => offer.target === initialTarget) ?? offers.find(offer => offer.target === 'initial') ?? offers[0]
  const [localTarget, setTarget] = useState(defaultOffer.target)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const target = onSelect ? initialTarget : localTarget
  const selected = offers.find(offer => offer.target === target) ?? defaultOffer
  const digital = selected.target === 'membership'

  return <div className={styles.join} data-membership-purchase>
    <h2 className={styles.purchaseTitle}>{ownership === 'membership' ? 'Your Voyager membership.' : ownership === 'initial' ? 'Activate Packs 3–4.' : 'Choose how to join.'}</h2>
    <div className={styles.sharedBenefits}>
      {ownership === 'membership' ? <p><strong>Active · S26</strong> · $12 paid. Your payment is credited when you add Packs.</p>
        : ownership === 'initial' ? <p>Add the remaining Packs for $460.</p>
        : <p>Access to Collective records and participation privileges.</p>}
    </div>
    <fieldset className={styles.bundleChoices} disabled={loading || disabled}>
      <legend className="sr-only">{ownership === 'none' ? 'Choose a Voyager option' : 'Choose your upgrade'}</legend>
      {offers.map(offer => {
        const chosen = selected.target === offer.target
        const showDetail = !chosen || ownership === 'initial'
        return <label className={`${styles.bundleCard} ${chosen ? styles.bundleSelected : ''}`} key={offer.target}>
          <input type="radio" name={`${controlId}-membership-offer`} data-membership-offer value={offer.target} checked={chosen}
            onChange={() => { setTarget(offer.target); onSelect?.(offer.target) }} aria-labelledby={`${controlId}-membership-name-${offer.target} ${controlId}-membership-price-${offer.target}`}
            aria-describedby={showDetail ? `${controlId}-membership-detail-${offer.target}` : undefined} />
          <span className={styles.bundleCopy}>
            <span className={styles.bundleHeading}>
              <span id={`${controlId}-membership-name-${offer.target}`}>{offer.name}</span>
              <strong ref={chosen ? priceRef : undefined} id={`${controlId}-membership-price-${offer.target}`}>{dollars(offer.amount)}</strong>
            </span>
            {showDetail && <span className={styles.bundleDetail} id={`${controlId}-membership-detail-${offer.target}`}>
              {offer.target === 'membership' ? 'Your place in the Collective'
                : offer.target === 'initial' ? 'Packs 1–2'
                  : ownership === 'initial' ? 'Console + Pack 4' : 'Packs 1–4 · Console included'}
            </span>}
            {offer.credit > 0 && <span className={styles.bundleNote}>{dollars(offer.listAmount)} − {dollars(offer.credit)} already paid</span>}
          </span>
          {chosen && ownership !== 'initial' && renderOfferImages(offer.target)}
        </label>
      })}
    </fieldset>
    <div className={styles.purchaseTerms}>
      <p>One payment. No subscription.</p>
      {!digital && <p>Ships to the 48 contiguous US states and DC.</p>}
    </div>
    <ArchiveButton className={styles.become} fullWidth loading={loading} disabled={disabled} onClick={() => onCheckout ? onCheckout(selected.target) : setCheckoutOpen(true)}>
      {ownership === 'none' ? 'Continue' : 'Upgrade'} · {dollars(selected.amount)} <ArrowRight size={20} aria-hidden="true" />
    </ArchiveButton>
    {reason && <p className={styles.notice} role="status">{reason}</p>}
    {error && <p ref={errorRef} tabIndex={-1} className={styles.error} role="alert">{error}</p>}
    <ArchiveSheet open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Shopify checkout preview">
      <p>{selected.name} · {dollars(selected.amount)} USD</p>
      {selected.credit > 0 && <p>Includes your {dollars(selected.credit)} membership credit.</p>}
      {!digital && <p>This order requires a delivery address.</p>}
      <p>Preview only. No payment is collected.</p>
    </ArchiveSheet>
  </div>
}
