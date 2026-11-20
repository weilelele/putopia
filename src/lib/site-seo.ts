/**
 * Plain-language descriptions of Multiverse Collective for search engines and
 * AI answer engines. In-world copy ("classified", "authorized personnel")
 * stays in the experience; metadata and structured data say what the product
 * actually is, so generative search can place it in the right categories.
 */
import { INITIATION_PRICES, type InitiationOrderKind } from './initiation-pricing'

export const SITE_URL = 'https://www.multiverseco.org'
export const SITE_NAME = 'Multiverse Collective'
export const SITE_TAGLINE = 'Exploring parallel worlds, together'

/** One canonical definition. Reuse it verbatim wherever the brand is described. */
export const SITE_DESCRIPTION =
  'Multiverse Collective is a hardware-based sci-fi game that brings the virtual into reality. Voyagers claim a physical device, the Multiverse Console, to look into different parallel worlds. This retro sci-fi device decodes signals, so Voyagers can explore those worlds and try to change their course.'

/** Link previews open in-world, then state the same facts as SITE_DESCRIPTION. */
export const SITE_SHARE_DESCRIPTION =
  'We own devices looking into parallel worlds. Multiverse Collective is a hardware-based sci-fi game: claim the Multiverse Console, decode signals, explore parallel worlds and try to change their course.'

export const SITE_KEYWORDS = [
  'hardware-based sci-fi game',
  'sci-fi game',
  'retro sci-fi device',
  'sci-fi gadget',
  'novelty gift',
  'unique gift for sci-fi fans',
  'parallel worlds',
  'multiverse',
]

const SHIPPING_REGION = 'Physical Packs ship to the 48 contiguous US states and Washington, DC.'

/** The initiation page sells Membership only when INITIATION_MEMBERSHIP_ENABLED is on. */
export function initiationDescription({ membershipEnabled }: { membershipEnabled: boolean }) {
  const options = membershipEnabled
    ? 'Choose Voyager Membership, or a one-time Voyager Pack bundle with physical Packs and the Multiverse Console.'
    : 'Choose a one-time Voyager Pack bundle: physical Packs, with the Multiverse Console in the Complete Voyager Pack.'
  return `Become a Voyager in Multiverse Collective, a hardware-based sci-fi game. ${options} ${SHIPPING_REGION}`
}

/** JSON.stringify for an inline <script>: escape `<` so content cannot close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/assets/logo.png`,
        slogan: SITE_TAGLINE,
        description: SITE_DESCRIPTION,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: 'en',
      },
    ],
  }
}

const OFFER_DESCRIPTIONS: Record<InitiationOrderKind, string> = {
  membership: 'Voyager member access to Mission Briefings, Parallax Array observations, Classified Intel and Member Votes. No physical Packs.',
  initial: 'Voyager membership plus Packs 1–2: a welcome letter, badge and Antenna for the Multiverse Console. Does not include the Console.',
  standard: 'Voyager membership plus all four Packs, including the Multiverse Console.',
  legacy_upgrade: 'Adds the Multiverse Console and Pack 4 to an Initial Voyager Pack.',
}

/** Product markup for the Voyager Initiation page. Only list offers a visitor can buy there. */
export function initiationProductJsonLd({ membershipEnabled, seatsFull }: { membershipEnabled: boolean; seatsFull: boolean }) {
  const kinds: InitiationOrderKind[] = membershipEnabled ? ['membership', 'initial', 'standard'] : ['initial', 'standard']
  const url = `${SITE_URL}/voyager-initiation`
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: 'Multiverse Collective Voyager Initiation',
    description: initiationDescription({ membershipEnabled }),
    url,
    image: [`${SITE_URL}/assets/device-console.jpg`],
    brand: { '@type': 'Brand', name: SITE_NAME },
    category: 'Toys & Games > Games',
    offers: kinds.map((kind) => ({
      '@type': 'Offer',
      name: INITIATION_PRICES[kind].name,
      description: OFFER_DESCRIPTIONS[kind],
      price: (INITIATION_PRICES[kind].amount / 100).toFixed(2),
      priceCurrency: 'USD',
      // Every option, Membership included, uses one of the limited S26 seats.
      availability: seatsFull ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      url,
      seller: { '@id': `${SITE_URL}/#organization` },
    })),
  }
}

type FaqItemSource = {
  question: string
  answer: string
  paragraphs?: readonly string[]
  dispatches?: readonly { label: string; month: string }[]
  claimLink?: string
  afterClaimLink?: string
}

/** Flattens the rendered FAQ (links, dispatch tables) into plain answer text. */
export function faqAnswerText(item: FaqItemSource): string {
  const parts = [
    item.claimLink ? `${item.answer}${item.claimLink}${item.afterClaimLink ?? ''}` : item.answer,
    ...(item.dispatches?.map((d) => `${d.label}: ${d.month}.`) ?? []),
    ...(item.paragraphs ?? []),
  ]
  return parts.map((p) => p.trim()).filter(Boolean).join(' ')
}

export function faqPageJsonLd(groups: readonly { items: readonly FaqItemSource[] }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: groups.flatMap((group) => group.items).map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: faqAnswerText(item) },
    })),
  }
}
