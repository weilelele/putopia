import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { BackLink } from '@/components/back-link'
import { geoPageJsonLd, geoPages, quickFacts, type GeoBlock, type GeoPage } from '@/lib/geo-pages'
import { SITE_NAME, serializeJsonLd } from '@/lib/site-seo'
import styles from './about.module.css'

/** Same switch as /voyager-initiation, read at build time for these static pages. */
export const membershipOptions = () => ({ membershipEnabled: process.env.INITIATION_MEMBERSHIP_ENABLED === 'true' })

export function geoMetadata(page: GeoPage): Metadata {
  return {
    title: page.metaTitle,
    description: page.description,
    alternates: { canonical: page.path },
    openGraph: {
      type: 'article',
      siteName: SITE_NAME,
      url: page.path,
      title: page.metaTitle,
      description: page.description,
      images: [{ url: '/assets/device-console.jpg', width: 1280, height: 1023, alt: 'Rendering of the Multiverse Console, a retro sci-fi device with tuning dials' }],
    },
  }
}

function Block({ block }: { block: GeoBlock }) {
  switch (block.kind) {
    case 'p': return <p>{block.text}</p>
    case 'list': return <ul className={styles.list}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>
    case 'compare': return <dl className={styles.compare}>
      <div><dt>Typically</dt><dd>{block.typical}</dd></div>
      <div><dt>{SITE_NAME}</dt><dd>{block.ours}</dd></div>
    </dl>
  }
}

export function GeoArticle({ page }: { page: GeoPage }) {
  const options = membershipOptions()
  const related = geoPages(options).filter((other) => other.path !== page.path)
  const [lede, ...answer] = page.answer
  return <main className="main" data-route-scroll>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(geoPageJsonLd(page)) }} />
    <article className={styles.article}>
      <BackLink href={page.slug ? '/about' : '/console'} label={page.slug ? 'Back to About' : 'Back to Dashboard'} />
      <ArchivePageHeader title={page.title} />
      <p className={styles.lede}>{lede}</p>
      {answer.map((text) => <p key={text}>{text}</p>)}

      {page.image && <figure className={styles.figure}>
        <Image src={page.image.src} alt={page.image.alt} width={page.image.width} height={page.image.height} sizes="(max-width: 767px) 100vw, 720px" />
        <figcaption>{page.image.caption}</figcaption>
      </figure>}

      <section className={styles.section} aria-labelledby="quick-facts">
        <h2 id="quick-facts">Quick facts</h2>
        <dl className={styles.facts}>
          {quickFacts(options).map(({ term, detail }) => <div key={term}>
            <dt>{term}</dt>
            {typeof detail === 'string' ? <dd>{detail}</dd> : <dd><ul className={styles.list}>{detail.map((line) => <li key={line}>{line}</li>)}</ul></dd>}
          </div>)}
        </dl>
      </section>

      {page.sections.map((section) => <section className={styles.section} key={section.id} aria-labelledby={section.id}>
        <h2 id={section.id}>{section.heading}</h2>
        {section.blocks.map((block, index) => <Block key={index} block={block} />)}
      </section>)}

      <section className={styles.section} aria-labelledby="faq">
        <h2 id="faq">Questions</h2>
        {page.faq.map((item) => <div className={styles.faq} key={item.question}>
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
        </div>)}
      </section>

      <section className={styles.cta} aria-label="Become a Voyager">
        <p>Live seat availability, checkout and full terms are on the Voyager Initiation page.</p>
        <ArchiveLinkButton href="/voyager-initiation" variant="primary" fullWidth>SEE OPTIONS &amp; AVAILABILITY</ArchiveLinkButton>
      </section>

      <nav className={styles.section} aria-labelledby="related">
        <h2 id="related">More about {SITE_NAME}</h2>
        <ul className={styles.related}>
          {related.map((other) => <li key={other.path}><Link href={other.path}>{other.title}</Link></li>)}
          <li><Link href="/terms/initiation">Delivery &amp; aftercare terms</Link></li>
        </ul>
      </nav>
    </article>
  </main>
}
