'use client'

import { INITIATION_PRICES } from '@/lib/initiation-pricing'
import { ANTENNA } from '@/lib/antenna-copy'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import SmartImage from '@/components/smart-image'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveSheet } from '@/components/archive-sheet'
import { ConsoleCarousel } from '@/app/voyager-initiation/console-carousel'
import original from '@/app/voyager-initiation/initiation.module.css'
import styles from './preview.module.css'

const packs = [
  { title: 'Initial Voyager Pack', month: 'Oct 2026', image: '/voyager-pack/pack-email.png', alt: 'Welcome letter and Voyager badge', description: 'A welcome letter and exclusive Voyager badge.' },
  { title: ANTENNA.firstMention, month: 'Nov 2026', image: ANTENNA.image, alt: ANTENNA.imageAlt, description: ANTENNA.packDescription },
  { title: 'Multiverse Console', month: 'Dec 2026', image: '', alt: '', description: 'Your own device for exploring and interacting with parallel worlds.' },
  { title: 'A Fourth Delivery', month: 'Jan 2027', image: '/assets/voyager-initiation/fourth-delivery.png', alt: 'A sealed envelope awaiting its reveal', description: 'Contents to be announced.' },
]

const benefits = [
  { name: 'Mission Board', title: 'Your next assignment awaits.', image: '/assets/voyager-initiation/mission-board-v10.png', alt: 'The Mission Board beside a Multiverse Console', description: 'Take on emergency observations, attempt contact across worlds, and explore unknown frequencies.' },
  { name: 'Classified Intel', title: 'Beyond the public archive.', image: '/assets/voyager-initiation/intel-questions.png', alt: 'Archival documents about the history and discoveries of the Collective', description: 'Explore the Collective’s history through classified records and field briefings.' },
  { name: 'Shape the Collective', title: 'Help shape what comes next.', image: '/assets/voyager-initiation/participation-questions.png', alt: 'Proposals for future worlds, Voyagers and device locations', description: 'Vote on the Collective’s future and get priority access to world-record activities. Pictured: proposals.' },
]

const bundles = {
  initial: { name: 'Initial Voyager Pack', price: INITIATION_PRICES.initial.amount / 100, detail: 'Welcome letter, Voyager badge and Antenna.', note: 'Add Console + Pack 4 later for $460.' },
  complete: { name: 'Complete Voyager Pack', price: INITIATION_PRICES.standard.amount / 100, detail: 'Everything in Initial, plus Console and Pack 4.', note: '' },
  upgrade: { name: 'Console + Fourth Delivery', price: INITIATION_PRICES.legacy_upgrade.amount / 100, detail: 'One Multiverse Console and the fourth delivery.', note: 'For existing Voyagers who already have the Initial Pack.' },
} as const

type Bundle = keyof typeof bundles

/** Visual fixture only: selection and confirmation stay in browser memory. */
export function VoyagerBundlesPreview() {
  const [member, setMember] = useState(false)
  const [choice, setChoice] = useState<'initial' | 'complete'>('initial')
  const [confirmation, setConfirmation] = useState(false)
  const selected: Bundle = member ? 'upgrade' : choice
  const bundle = bundles[selected]

  return <main className={`main ${original.page} ${original.benefitsFirst}`} data-route-scroll>
    <div className={original.content}>
      <div className={styles.previewBar}>
        <span>页面示意 · 不会发起支付</span>
        <a href="#bundle-choice">查看购买区 <ArrowRight size={14} aria-hidden /></a>
      </div>
      <Link href="/console" className="archive-back-link"><ArrowLeft size={20} aria-hidden />Back to Dashboard</Link>
      <header className={original.hero}>
        <div className={original.introduction}>
          <p className={original.eyebrow}>Become a Voyager</p>
          <h1>Voyager<br />Initiation</h1>
          <p className={original.lede}>One initiation. A lasting place in the Collective.</p>
        </div>
      </header>

      <h2 className={original.benefitsTitle}>Your life as<br />a Voyager.</h2>
      <section className={original.section} aria-labelledby="packs-title">
        <div className={original.sectionHeading}><h3 id="packs-title"><span className={original.chapter}>01</span>Physical Voyager Packs</h3></div>
        <ol className={original.packs}>
          {packs.map((pack, index) => <li key={pack.title} className={`${original.pack} ${index === 0 ? original.initialPack : ''} ${index === 2 ? original.consolePack : ''} ${index === 3 ? original.planned : ''}`}>
            {pack.image && <div className={original.packImage}><SmartImage src={pack.image} alt={pack.alt} sizes="(min-width: 1100px) 260px, 42vw" preload={index === 0} /></div>}
            <div className={original.packCopy}>
              <p className={original.packageNumber}>Package {index + 1} · {pack.month}</p>
              <h4>{pack.title}</h4><p>{pack.description}</p>
            </div>
            {index === 2 && <ConsoleCarousel suspended={confirmation} />}
          </li>)}
        </ol>
      </section>

      {benefits.map((benefit, index) => <section key={benefit.name} className={original.section} aria-labelledby={`benefit-${index}`}>
        <div className={original.sectionHeading}><h3 id={`benefit-${index}`}><span className={original.chapter}>0{index + 2}</span>{benefit.name}</h3></div>
        <div className={original.benefit}>
          <div className={`${original.benefitImage} ${index === 0 ? original.missionImage : ''}`}><SmartImage src={benefit.image} alt={benefit.alt} sizes="(min-width: 1100px) 560px, (min-width: 768px) 420px, 100vw" /></div>
          <div className={original.benefitCopy}><h3>{benefit.title}</h3><p>{benefit.description}</p>{index === 2 && <Link href="/vote?tab=classified">See current votes <ArrowRight size={20} aria-hidden /></Link>}</div>
        </div>
      </section>)}

      <section className={original.section} aria-labelledby="feed-title">
        <div className={original.sectionHeading}><h3 id="feed-title"><span className={original.chapter}>05</span>Voyager Feed</h3></div>
        <div className={original.benefitCopy}><h3>Your voice belongs here.</h3><p>Share updates in the Voyager Feed and join conversations with fellow members.</p></div>
      </section>

      <section className={`${original.section} ${styles.purchaseSection}`} id="bundle-choice" aria-labelledby="bundle-title">
        <div className={styles.purchase}>
          <p className={original.eyebrow}>Your initiation</p>
          <h2 id="bundle-title" className={styles.purchaseTitle}>Choose your bundle.</h2>
          {member ? <p className={styles.description}>Add the remaining two packs. Your existing Voyager membership stays with you.</p> : <div className={styles.sharedBenefits}>
            <p className={styles.sharedTitle}>Voyager membership included in both.</p>
          </div>}
          <fieldset className={styles.bundleList}>
            <legend className="sr-only">Choose a Voyager bundle</legend>
            {(member ? ['upgrade'] as const : ['initial', 'complete'] as const).map(key => <label key={key} className={`${styles.bundle} ${selected === key ? styles.selected : ''}`}>
              <input type="radio" name="bundle" value={key} aria-labelledby={`bundle-name-${key} bundle-price-${key}`} aria-describedby={`bundle-detail-${key}${bundles[key].note ? ` bundle-note-${key}` : ''}`} checked={selected === key} onChange={() => { if (key !== 'upgrade') setChoice(key) }} />
              <span className={styles.bundleCopy}>
                <span className={styles.bundleHeading}><span id={`bundle-name-${key}`}>{bundles[key].name}</span><strong id={`bundle-price-${key}`}>${bundles[key].price}</strong></span>
                <span className={styles.bundleDetail} id={`bundle-detail-${key}`}>{bundles[key].detail}</span>
                {bundles[key].note && <span className={styles.bundleNote} id={`bundle-note-${key}`}>{bundles[key].note}</span>}
              </span>
            </label>)}
          </fieldset>
          <ArchiveButton fullWidth className={styles.checkout} onClick={() => setConfirmation(true)}>CONTINUE · ${bundle.price}<ArrowRight size={20} aria-hidden /></ArchiveButton>
          <p className={styles.caption}>One payment. No subscription.</p>
          <button type="button" className={styles.memberToggle} onClick={() => setMember(value => !value)}>{member ? '← View bundles' : 'Already a Voyager? Upgrade · $460'}{!member && <ArrowRight size={16} aria-hidden />}</button>
          <p className={styles.mockNote}>Preview only. No payment.</p>
        </div>
      </section>

      <section className={original.section} aria-labelledby="faq-title">
        <div className={original.sectionHeading}><h2 id="faq-title">FAQ</h2></div>
        {[
          ['Is this a subscription?', 'No. Both bundles are a one-time payment.'],
          ['What’s the difference between the bundles?', 'Both include Voyager membership. Initial includes Packs 1–2; Complete includes all four, including the Console.'],
          ['Can I add the Console later?', 'Yes. Add Console + Pack 4 for $460, including if you bought the original $12 Initial Pack. Buying Complete upfront saves $10 compared with the current Initial + upgrade.'],
          ['When will the packs ship?', 'Planned dispatches: Oct 2026–Jan 2027, one pack per month. These are estimates; check your records for actual progress.'],
        ].map(([question, answer]) => <details className={original.faqItem} key={question}><summary>{question}</summary><p>{answer}</p></details>)}
      </section>
    </div>
    <ArchiveSheet open={confirmation} onClose={() => setConfirmation(false)} title={bundle.name} size="default" footer={<ArchiveButton fullWidth onClick={() => setConfirmation(false)}>BACK TO PREVIEW <ArrowRight size={18} aria-hidden /></ArchiveButton>}>
      <p className={styles.confirmDescription}>{bundle.detail}</p>
      <ul className={styles.confirmList}>
        {selected !== 'upgrade' && <li><Check size={16} aria-hidden />Voyager member access</li>}
        {selected !== 'upgrade' && <li><Check size={16} aria-hidden />Welcome letter, member badge & Antenna</li>}
        {selected !== 'initial' && <li><Check size={16} aria-hidden />Multiverse Console + fourth delivery</li>}
      </ul>
      <div className={styles.total}><span>One-time payment</span><strong>${bundle.price}</strong></div>
      <p className={styles.confirmDescription}>This is a purchase preview. No order or payment has been created.</p>
    </ArchiveSheet>
  </main>
}
