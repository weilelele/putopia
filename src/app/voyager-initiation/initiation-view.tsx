'use client'

import { INITIATION_PRICES, initiationPriceLabel } from '@/lib/initiation-pricing'
import { ANTENNA } from '@/lib/antenna-copy'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CircleAlert } from 'lucide-react'
import SmartImage from '@/components/smart-image'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { MemberStrip } from './member-strip'
import { ConsoleCarousel } from './console-carousel'
import type { InitiationPublicMember, InitiationSnapshot, InitiationStatus } from '@/lib/initiation-types'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveSheet } from '@/components/archive-sheet'
import type { VoyagerQuizServices } from '@/components/voyager-profile-quiz'
import { PostPaymentCalibration } from './post-payment-calibration'
import { CheckoutSignIn, type CheckoutSignInServices, type EmailCheckoutStep } from './checkout-sign-in'
import styles from './initiation.module.css'
import { INITIATION_FAQ } from './faq'
import { consoleDevicePath, deviceSourcePath, initiationLoginPath } from './navigation'
import { useInitiationEngagement } from './use-initiation-engagement'
import { useInitiationAnalytics } from './use-initiation-analytics'
import { initiationNextStep } from '@/lib/initiation-analytics'
import { InitiationBriefing } from './briefing/initiation-briefing'
import { BRIEFING_STORAGE_KEY, briefingAudience, briefingLinkOpens, briefingOffers, briefingRecord, shouldAutoOpenBriefing, type BriefingOffer, type BriefingOutcome, type BriefingRegion } from '@/lib/initiation-briefing'

const SOURCE_KEY = 'mc:initiation:device-source'
const subscribeToSource = () => () => {}
function readDeviceSource() {
  try { return deviceSourcePath(sessionStorage.getItem(SOURCE_KEY)) } catch { return null }
}
const emptyDeviceSource = () => null
// '' = nothing stored yet; 'server' and 'unavailable' never auto-open (no way to remember a dismissal).
function readBriefingStore() {
  try { return localStorage.getItem(BRIEFING_STORAGE_KEY) ?? '' } catch { return 'unavailable' }
}
const serverBriefingStore = () => 'server'
function writeBriefingStore(outcome: BriefingOutcome, page: number) {
  try { localStorage.setItem(BRIEFING_STORAGE_KEY, briefingRecord(outcome, page)) } catch { /* Storage is a convenience only. */ }
}


const paymentMessages = {
  pending: 'Payment is being processed. Membership and deliveries unlock only after payment is confirmed. Refresh to check the latest status.',
  payment_failed: 'Payment was not completed. You can retry when checkout is available.',
  canceled: 'Your checkout was canceled. You can retry when checkout is available.',
  refunded: 'Your Initiation payment was refunded. Previous delivery records remain visible; an active Console claim is not implied.',
  disputed: 'Your payment is under review. Entitlements may be paused until the review is complete.',
  payment_review: 'Your payment needs review. Initiation is not confirmed yet.',
}

const packs = [
  { title: 'Initial Voyager Pack', dispatch: 'Oct 2026', image: '/voyager-pack/pack-email.png', alt: 'A welcome letter and Voyager badge on a desk', description: 'A welcome letter and exclusive Voyager badge.' },
  { title: ANTENNA.firstMention, dispatch: 'Nov 2026', image: ANTENNA.image, alt: ANTENNA.imageAlt, description: ANTENNA.packDescription },
  { title: 'Multiverse Console', dispatch: 'Dec 2026', image: '/assets/voyager-initiation/console-multiview-portrait.png', alt: 'Multiverse Console in the Kyoto workshop: front, rear, side display and control dial views', featured: true, description: 'Your own device for exploring and interacting with parallel worlds.' },
  { title: 'A Fourth Delivery', dispatch: 'Jan 2027', image: '/assets/voyager-initiation/fourth-delivery.png', alt: 'A sealed envelope awaiting its reveal', description: 'Contents to be announced.', planned: true },
]

/** `accountStatus` is the signed-in account's state, so a guest who just signed in can see their own records. */
export type InitiationCheckoutResult = { status: 'ready' | 'not_open' | 'unauthenticated'; message: string; accountStatus?: InitiationStatus }
export type InitiationViewProps = {
  initialBundle?: 'initial' | 'standard'
  members?: InitiationPublicMember[]
  snapshot: InitiationSnapshot
  deviceSource?: string | null
  checkoutCanceled?: boolean
  beginCheckout: () => Promise<InitiationCheckoutResult>
  quizServices?: VoyagerQuizServices
  /** Sign-in calls for the Pay dialog; fixtures pass fakes so no email or account is created. */
  signInServices?: CheckoutSignInServices
  /** Guest email checkout; fixtures pass a fake so no account or payment session is created. */
  startEmailCheckout?: (email: string, bundle: 'initial' | 'standard', options?: { upgrade?: boolean }) => Promise<EmailCheckoutStep>
  paymentPlacement?: 'top' | 'bottom'
  analyticsEnvironment?: string
  regions?: BriefingRegion[]
  /** Value of `?briefing=`; `1` opens the briefing on arrival. */
  briefingParam?: string
}

export function InitiationView({ initialBundle = 'initial', snapshot, members = [], deviceSource = null, checkoutCanceled = false, beginCheckout, quizServices, signInServices, startEmailCheckout, paymentPlacement = 'bottom', analyticsEnvironment = 'unknown', regions = [], briefingParam }: InitiationViewProps) {
  const storedSource = useSyncExternalStore(subscribeToSource, readDeviceSource, emptyDeviceSource)
  const source = deviceSourcePath(deviceSource) ?? storedSource
  useEffect(() => {
    if (deviceSourcePath(deviceSource)) {
      try { sessionStorage.setItem(SOURCE_KEY, deviceSource!) } catch { /* URL still preserves the current intent. */ }
    }
  }, [deviceSource])
  const [dialog, setDialog] = useState<'batch' | 'initiated' | 'legacy-discount' | null>(null)
  const [bundle, setBundle] = useState<'initial' | 'standard'>(initialBundle)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  // A guest picks a bundle and enters an email: a new email goes straight to payment,
  // an activated account signs in with its password and then continues with that bundle.
  const [signInOpen, setSignInOpen] = useState(false)
  const [signedInHere, setSignedInHere] = useState(false)
  const pendingBundle = useRef<'initial' | 'standard'>(initialBundle)
  const { availability, status, shipments, consoleClaim } = snapshot
  const initiated = status === 'initiated'
  const granted = status === 'granted'
  const legacy = status === 'legacy_pack'
  const kind = legacy ? 'legacy_upgrade' : bundle
  const storedBriefing = useSyncExternalStore(subscribeToSource, readBriefingStore, serverBriefingStore)
  const [briefing, setBriefing] = useState<'idle' | 'replay' | 'link' | 'dismissed'>(() => briefingLinkOpens(snapshot.status, briefingParam) ? 'link' : 'idle')
  const briefingAuto = storedBriefing !== 'server' && storedBriefing !== 'unavailable'
    && shouldAutoOpenBriefing({ status, paymentStatus: snapshot.paymentStatus, checkoutCanceled, stored: storedBriefing || null })
  const briefingOpen = briefing === 'replay' || briefing === 'link' || (briefing === 'idle' && briefingAuto)
  const soldOut = !snapshot.ownsSeat && (availability.remaining === 0 || (availability.initiated !== null && availability.initiated >= availability.capacity))
  const { priceRef, capture: captureAnalytics, getContext: analyticsContext } = useInitiationAnalytics({ kind, userId: snapshot.userId,
    internal: snapshot.role === 'architect', environment: analyticsEnvironment, eligible: !initiated && !granted && status !== 'unknown', modalOpen: dialog !== null || briefingOpen })

  const contentRef = useInitiationEngagement(captureAnalytics, dialog !== null || briefingOpen)

  async function become(override?: 'initial' | 'standard', surface: 'page' | 'brief' = 'page') {
    if (inFlight.current || initiated || granted || soldOut || status === 'unknown') return
    const chosen = override ?? bundle
    captureAnalytics('initiation_cta_clicked', { next_step: initiationNextStep(status), surface, bundle: legacy ? 'legacy_upgrade' : chosen })
    setError('')
    if (status === 'guest' && !signedInHere) { pendingBundle.current = chosen; setSignInOpen(true); return }
    await continueToCheckout(chosen)
  }

  function signedIn() {
    setSignedInHere(true)
    setSignInOpen(false)
    void continueToCheckout(pendingBundle.current, true)
  }

  async function emailCheckout(email: string, options?: { upgrade?: boolean }): Promise<EmailCheckoutStep> {
    const chosen = pendingBundle.current
    if (startEmailCheckout) return startEmailCheckout(email, chosen, options)
    const unavailable = 'Checkout is unavailable. Please try again.'
    try {
      const response = await fetch('/api/initiation-checkout/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, bundle: chosen, upgrade: options?.upgrade === true, from: source, analytics: analyticsContext() }) })
      const data = await response.json()
      if (response.ok && typeof data.url === 'string' && new URL(data.url).protocol === 'https:') {
        window.location.assign(data.url)
        return { kind: 'redirected' }
      }
      if (response.ok && ['password', 'activation_sent', 'already_member', 'upgrade'].includes(data.next)) return { kind: data.next }
      if (response.ok && data.next === 'checkout') { signedIn(); return { kind: 'redirected' } }
      return { kind: 'error', message: typeof data.error === 'string' ? data.error : unavailable }
    } catch {
      return { kind: 'error', message: unavailable }
    }
  }

  async function continueToCheckout(chosen: 'initial' | 'standard', afterSignIn = false) {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    try {
      const result = await beginCheckout()
      // This page was rendered for a guest. A member (or an Initial Pack owner, who can only add the
      // $460 upgrade) sees their own records and options after a reload instead of an error.
      if (afterSignIn && result.accountStatus && result.accountStatus !== 'unpaid') {
        window.location.reload()
        return
      }
      if (result.status === 'unauthenticated') {
        window.location.assign(initiationLoginPath(source, chosen))
      } else if (result.status === 'ready') {
        const response = await fetch('/api/initiation-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bundle: legacy ? 'standard' : chosen, from: source, analytics: analyticsContext() }) })
        const data = await response.json()
        if (response.status === 401) {
          window.location.assign(initiationLoginPath(source, chosen))
        } else if (response.ok && typeof data.url === 'string' && new URL(data.url).protocol === 'https:') {
          window.location.assign(data.url)
        } else {
          setError(typeof data.error === 'string' ? data.error : 'Checkout is unavailable. Please try again.')
        }
      } else {
        setError(result.message)
      }
    } catch {
      setError('We could not check your access. Please try again.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  function closeBriefing(outcome: BriefingOutcome, page: number) {
    writeBriefingStore(outcome, page)
    setBriefing('dismissed')
  }
  function chooseFromBriefing(offer: BriefingOffer['id'], page: number) {
    closeBriefing('chose_offer', page)
    const choice = offer === 'initial' || offer === 'standard' ? offer : undefined
    if (choice) setBundle(choice)
    void become(choice, 'brief')
  }
  const briefingUnavailable = status === 'unknown' ? 'Records are unavailable right now. Please try again later.'
    : soldOut ? `${availability.batch} is fully claimed.`
    : !availability.checkoutOpen && status !== 'guest' ? (availability.reason ?? 'Checkout is not open yet.') : null

  const paymentAtBottom = paymentPlacement === 'bottom' && !initiated && !granted
  const BenefitHeading = paymentAtBottom ? 'h3' : 'h2'
  const PackHeading = paymentAtBottom ? 'h4' : 'h3'
  const seatSummary = (
          <dl className={styles.seats} aria-label="First release seats">
            <div><dt className={styles.seatLabel}><strong>{availability.batch}</strong><span>SEAT LIMIT</span><button type="button" className={styles.batchInfo} aria-label="About batch S26" aria-haspopup="dialog" onClick={() => setDialog('batch')}><CircleAlert size={15} aria-hidden /></button></dt><dd>{availability.capacity}</dd></div>
            <div><dt className={styles.seatLabel}><span>INITIATED</span><button type="button" className={styles.batchInfo} aria-label="About initiated places" aria-haspopup="dialog" onClick={() => setDialog('initiated')}><CircleAlert size={15} aria-hidden /></button></dt><dd aria-label={availability.initiated === null ? 'Count not yet available' : undefined}>{availability.initiated ?? '—'}</dd><dd className={styles.memberQueue}><MemberStrip members={members} /></dd></div>
          </dl>
  )
  const joinPanel = (
        <div data-initiation-section="payment" className={styles.join}>
          {checkoutCanceled && !initiated && !granted && <p className={styles.notice} role="status">You returned from checkout without completing it. Payment status below comes from your order records.</p>}
          {snapshot.error && <p className={styles.notice} role="alert">{snapshot.error} <button className={styles.textLink} onClick={() => window.location.reload()}>Try again</button></p>}
          {snapshot.paymentStatus !== 'none' && snapshot.paymentStatus !== 'paid' && snapshot.paymentStatus !== 'unknown' && <p className={styles.notice} role="status">{paymentMessages[snapshot.paymentStatus]}</p>}
          {granted ? <>
            <p className={styles.memberStatus}>{availability.batch} · Membership registered</p>
            <p className={styles.paymentTerms}>You have joined the Collective through a granted membership. No Initiation payment is recorded.</p>
            <p className={styles.paymentTerms}>This membership does not include paid Pack deliveries or a Console claim.</p>
            <ArchiveLinkButton href="/console" fullWidth variant="primary">RETURN TO DASHBOARD <ArrowRight size={20} aria-hidden /></ArchiveLinkButton>
          </> : initiated ? <>
            <p className={styles.memberStatus}>{availability.batch} · Initiation confirmed</p>
            <p className={styles.paymentTerms}>Your lasting membership and personal dispatch records are shown below.</p>
            <ArchiveLinkButton href={consoleDevicePath(source, consoleClaim.href)} fullWidth variant="primary">{consoleClaim.claimed ? 'VIEW YOUR DEVICE' : consoleClaim.eligible ? 'VIEW DEVICE & CLAIM' : 'VIEW DEVICE'} <ArrowRight size={20} aria-hidden /></ArchiveLinkButton>
            <p className={styles.paymentTerms}>{consoleClaim.claimed ? 'Your Console has been claimed. Open Device to see its details.' : !consoleClaim.eligible ? 'Open Device to check current claim eligibility and availability.' : 'Claim your Console on Device when stock is available. If the batch is full, wait for availability; your entitlement is retained.'}</p>
            <a className={styles.textLink} href="#packs-title">View your packs <ArrowRight size={20} aria-hidden /></a>
          </> : <>
          {!paymentAtBottom && seatSummary}
          <p className={styles.eyebrow}>Your initiation</p>
          <h2 className={styles.purchaseTitle}>{legacy ? 'Complete your packs.' : 'Choose your bundle.'}</h2>
          {legacy ? <p className={styles.paymentTerms}>Add the remaining two packs. Your existing Voyager membership stays with you.</p> : <div className={styles.sharedBenefits}>
            <p>Voyager membership included in both.</p>
          </div>}
          <fieldset className={styles.bundleChoices} disabled={busy}>
            <legend className="sr-only">{legacy ? 'Your Voyager upgrade' : 'Choose a Voyager bundle'}</legend>
            {(legacy ? ['legacy_upgrade'] as const : ['initial', 'standard'] as const).map(option => <label className={`${styles.bundleCard} ${kind === option ? styles.bundleSelected : ''}`} key={option}>
              <input type="radio" name="voyager-bundle" value={option} aria-labelledby={`bundle-name-${option} bundle-price-${option}`} aria-describedby={`bundle-detail-${option}${option !== 'standard' ? ` bundle-note-${option}` : ''}`} checked={kind === option} onChange={() => { if (option !== 'legacy_upgrade') setBundle(option) }} />
              <span className={styles.bundleCopy}>
                <span className={styles.bundleHeading}><span id={`bundle-name-${option}`}>{INITIATION_PRICES[option].name}</span><strong ref={kind === option ? priceRef : undefined} id={`bundle-price-${option}`}>{initiationPriceLabel(option)}</strong></span>
                <span className={styles.bundleDetail} id={`bundle-detail-${option}`}>{option === 'initial' ? 'Welcome letter, Voyager badge and Antenna.' : option === 'standard' ? 'Everything in Initial, plus Console and Pack 4.' : 'One Multiverse Console and the fourth delivery.'}</span>
                {option !== 'standard' && <span className={styles.bundleNote} id={`bundle-note-${option}`}>{option === 'initial' ? `Add Console + Pack 4 later for ${initiationPriceLabel('legacy_upgrade')}.` : 'For Initial Pack members, including historical $12 buyers. Your first two packs stay with you.'}</span>}
              </span>
            </label>)}
          </fieldset>
          <p className={styles.paymentTerms}>One payment. No subscription.</p>
          <ArchiveButton className={styles.become} fullWidth onClick={() => void become()} loading={busy} disabled={soldOut || status === 'unknown'}>
            <span>{status === 'unknown' ? 'RECORDS UNAVAILABLE' : soldOut ? 'FULLY CLAIMED' : `${legacy ? 'UPGRADE' : 'CONTINUE'} · ${initiationPriceLabel(kind)}`}</span>{!legacy && <ArrowRight size={20} aria-hidden />}
          </ArchiveButton>
          {legacy && !availability.checkoutOpen && !error && <p className={styles.paymentTerms}>{availability.reason ?? 'Continue Initiation checkout is not open yet.'}</p>}
          <section className={styles.delivery} aria-label="Delivery">
            <h2>Delivery</h2>
            <p>Contiguous US. Shipping &amp; taxes included.</p>
            <Link className={styles.textLink} href="/terms/initiation">Delivery &amp; aftercare <ArrowRight size={18} aria-hidden /></Link>
          </section>
          {!availability.checkoutOpen && !legacy && !error && <p className={styles.paymentTerms}>{availability.reason ?? 'Checkout is not open. You can browse and save your Signal Calibration.'}</p>}
          </>}
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
  )

  return <main className={`main ${styles.page} ${paymentAtBottom ? styles.benefitsFirst : ''}`} data-route-scroll>
    <div ref={contentRef} className={styles.content}>
      <Link href="/console" className="archive-back-link"><ArrowLeft aria-hidden size={20} />Back to Dashboard</Link>
      <header data-initiation-section="intro" className={styles.hero}>
        <div className={styles.introduction}>
          <p className={styles.eyebrow}>{initiated || granted ? 'Your membership' : legacy ? 'Your Initial membership' : 'Become a Voyager'}</p>
          <h1>Voyager<br />Initiation</h1>
          <p className={styles.lede}>One initiation. A lasting place in the Collective.</p>
          {briefingAudience(status) && <button type="button" className={styles.textLink} aria-haspopup="dialog" onClick={() => setBriefing('replay')}>Watch the briefing <ArrowRight size={18} aria-hidden /></button>}
        </div>
        {paymentAtBottom ? seatSummary : joinPanel}
      </header>

      <section aria-label={paymentAtBottom ? undefined : 'Voyager benefits'} aria-labelledby={paymentAtBottom ? 'voyager-benefits-title' : undefined}>
      {paymentAtBottom && <h2 id="voyager-benefits-title" className={styles.benefitsTitle}>Your life as<br />a Voyager.</h2>}
      {(!granted || shipments.length > 0) && <section className={styles.section} aria-labelledby="packs-title">
        <div className={styles.sectionHeading}><BenefitHeading id="packs-title">{paymentAtBottom && <span className={styles.chapter}>01</span>}{paymentAtBottom ? 'Physical Voyager Packs' : 'Voyager Packs'}</BenefitHeading></div>
        <ol className={styles.packs}>
          {packs.map((pack, index) => {
            const shipment = shipments.find(item => item.position === index + 1)
            const deviceHref = consoleClaim.batch ? `/devices/batches/${consoleClaim.batch.slug}` : consoleDevicePath(source, consoleClaim.href)
            return <li data-initiation-section={`pack_${index + 1}`} key={pack.title} className={`${styles.pack} ${index === 0 ? styles.initialPack : ''} ${index === 1 ? styles.antennaPack : ''} ${pack.featured ? styles.consolePack : ''} ${pack.planned ? styles.planned : ''}`}>
              {!pack.featured && <div className={styles.packImage}><SmartImage src={pack.image} alt={pack.alt} sizes="(min-width: 1100px) 320px, (min-width: 768px) 240px, 42vw" preload={index === 0} /></div>}
              <div className={styles.packCopy}>
                <p className={styles.packageNumber}>Package {index + 1}<span> · {shipment?.scheduledMonth ? new Date(`${shipment.scheduledMonth}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : pack.dispatch}</span></p>
                <PackHeading>{pack.title}</PackHeading>
                {legacy && index < 2 && <p className={styles.packAccess}>Included in Initial Pack</p>}
                {pack.featured && consoleClaim.claimed && <p className={styles.packAccess}>{consoleClaim.batch?.name ?? 'Batch details unavailable'}</p>}
                <p className={index === 1 ? styles.antennaCopy : undefined}>{pack.description}</p>
                {shipment ? shipment.status !== 'planned' && <p className={styles.shipmentStatus}>{shipment.status}</p> : initiated ? <p className={styles.shipmentStatus}>Progress unavailable</p> : null}
                {shipment?.trackingUrl && <a className={styles.textLink} href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer">Track delivery <ArrowRight size={18} aria-hidden /></a>}
              </div>
              {pack.featured && <>
                <ConsoleCarousel suspended={dialog !== null} />
                <Link className={styles.consoleExplore} href={deviceHref}>{consoleClaim.claimed ? 'View your batch' : 'Explore the Console'} <ArrowRight size={22} aria-hidden /></Link>
              </>}
            </li>
          })}
        </ol>
      </section>}

      <section data-initiation-section="mission_board" className={styles.section} aria-labelledby="mission-benefit-title">
        <div className={styles.sectionHeading}><BenefitHeading id="mission-benefit-title">{paymentAtBottom && <span className={styles.chapter}>02</span>}Mission Board</BenefitHeading></div>
        <div className={styles.benefit}>
          <div className={`${styles.benefitImage} ${styles.missionImage}`}><SmartImage src="/assets/voyager-initiation/mission-board-v10.png" alt="A phone displaying the Mission Board beside a Multiverse Console on a wooden workbench" sizes="(min-width: 1100px) 560px, (min-width: 768px) 420px, 100vw" /></div>
          <div className={styles.benefitCopy}><h3>Your next assignment awaits.</h3><p>Take on emergency observations, attempt contact across worlds, and explore unknown frequencies.</p><Link href={snapshot.userId ? '/console#mission-board' : '/login?redirect=%2Fconsole%23mission-board'}>Explore the Mission Board <ArrowRight size={20} aria-hidden /></Link></div>
        </div>
      </section>

      <section data-initiation-section="intel" className={styles.section} aria-labelledby="intel-title">
        <div className={styles.sectionHeading}><BenefitHeading id="intel-title">{paymentAtBottom && <span className={styles.chapter}>03</span>}Classified Intel</BenefitHeading></div>
        <div className={styles.benefit}>
          <div className={styles.benefitImage}><SmartImage src="/assets/voyager-initiation/intel-questions.png" alt="Archival documents asking: How long has the Collective existed? Who were the first Voyagers? What did they discover?" sizes="(min-width: 1100px) 560px, (min-width: 768px) 420px, 100vw" /></div>
          <div className={styles.benefitCopy}><h3>Beyond the public archive.</h3><p>Explore the Collective’s history through classified records and field briefings.</p><Link href="/intel?tab=classified">Explore intel <ArrowRight size={20} aria-hidden /></Link></div>
        </div>
      </section>

      <section data-initiation-section="participation" className={styles.section} aria-labelledby="participation-title">
        <div className={styles.sectionHeading}><BenefitHeading id="participation-title">{paymentAtBottom && <span className={styles.chapter}>04</span>}{paymentAtBottom ? 'Shape the Collective' : 'Participate'}</BenefitHeading></div>
        <div className={styles.benefit}>
          <div className={styles.benefitImage}><SmartImage src="/assets/voyager-initiation/participation-questions.png" alt="Proposed decisions on physical maps and dossiers: Which world next? How many new Voyagers? Reveal our device locations? Investigate a new antenna organization?" sizes="(min-width: 1100px) 560px, (min-width: 768px) 420px, 100vw" /></div>
          <div className={styles.benefitCopy}><h3>Help shape what comes next.</h3><p>Vote on the Collective’s future and get priority access to world-record activities. Pictured: proposals.</p><Link href="/vote?tab=classified">See current votes <ArrowRight size={20} aria-hidden /></Link></div>
        </div>
      </section>
      </section>
      {paymentAtBottom && <section className={`${styles.section} ${styles.bottomPayment}`} aria-label="Voyager Initiation checkout">{joinPanel}</section>}
      <section data-initiation-section="faq" className={styles.section} aria-labelledby="initiation-faq-title">
        <div className={styles.sectionHeading}><h2 id="initiation-faq-title">FAQ</h2></div>
        {INITIATION_FAQ.map(item => <details key={item.question} className={styles.faqItem}>
          <summary>{item.question}</summary><p>{item.answer}{'detailsLink' in item && <> See <Link href={item.detailsLink}>Delivery &amp; aftercare</Link> for fulfillment and access rules.</>}</p>
        </details>)}
      </section>
    </div>

    {briefingOpen && <InitiationBriefing trigger={briefing === 'idle' ? 'auto' : briefing === 'link' ? 'link' : 'replay'} members={members} regions={regions}
      seats={{ batch: availability.batch, capacity: availability.capacity, initiated: availability.initiated }} offers={briefingOffers(status)}
      busy={busy} unavailable={briefingUnavailable} capture={captureAnalytics} onChoose={chooseFromBriefing} onClose={closeBriefing} />}
    {quizServices && <PostPaymentCalibration snapshot={snapshot} quizServices={quizServices} autoInvite onAnalytics={captureAnalytics} />}
    <CheckoutSignIn open={signInOpen} onClose={() => setSignInOpen(false)} onSignedIn={signedIn} onEmail={emailCheckout} capture={captureAnalytics} services={signInServices} />
    <ArchiveSheet open={dialog === 'legacy-discount'} onClose={() => setDialog(null)} title="Initial Pack member discount">
      <p>All Initial Pack members, including historical $12 buyers, can add Console + Pack 4 for $460.</p>
      <p>Your first two packs remain separate. The upgrade is a fixed additional payment, not a subtraction of your earlier payment.</p>
    </ArchiveSheet>
    <ArchiveSheet open={dialog === 'initiated'} onClose={() => setDialog(null)} title="Initiated places">
      <p>Includes purchased, gifted, and story-character places.</p>
    </ArchiveSheet>
    <ArchiveSheet open={dialog === 'batch'} onClose={() => setDialog(null)} title="Batch S26">
      <p>S26 is the first Voyager Initiation release, limited to 100 seats.</p>
      <p>Complete Pack includes four dispatches; Initial includes the first two. The planned S26 dispatch months are: October, November and December 2026, then January 2027. This schedule follows the batch, regardless of when you join.</p>
      <p>Further batches may open later with their own availability and dispatch schedules.</p>
    </ArchiveSheet>

  </main>
}
