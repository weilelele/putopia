/**
 * Product feeds for Google Merchant Center (RSS 2.0) and ChatGPT shopping
 * (JSONL). Pure mapping: the routes in src/app/feeds/ supply live seat and
 * checkout state, and prices always come from INITIATION_PRICES, so a feed
 * never quotes a price or stock level the initiation page would not show.
 *
 * Only physical Packs are listed. Voyager Membership is digital member access
 * with no physical goods: Google's Shopping policy does not support services
 * or online-game access, and OpenAI's product feeds cover physical goods. The
 * legacy upgrade is sold only to existing Initial Pack members.
 */
import { INITIATION_PRICES } from './initiation-pricing'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site-seo'

export type FeedKind = 'initial' | 'standard'
export type FeedAvailability = 'in_stock' | 'out_of_stock' | 'preorder'

/** Live state read at request time. `checkoutOpen` mirrors initiationConfigurationError per kind. */
export type ShoppingFeedState = {
  remainingSeats: number
  checkoutOpen: Record<FeedKind, boolean>
  now: Date
}

/**
 * Planned S26 dispatch months, as published in the initiation FAQ. A test
 * keeps the two in sync; change both together.
 */
export const S26_DISPATCHES = [
  { pack: 1, label: 'Pack 1', month: '2026-10' },
  { pack: 2, label: 'Pack 2', month: '2026-11' },
  { pack: 3, label: 'Pack 3 · Multiverse Console', month: '2026-12' },
  { pack: 4, label: 'Pack 4', month: '2027-01' },
] as const

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function dispatchMonthLabel(month: string): string {
  const [year, index] = month.split('-').map(Number)
  return `${MONTHS[index - 1]} ${year}`
}

/** Dispatch months are planned in US Pacific time; use the first day of the month, midnight PST. */
export function dispatchMonthStart(month: string): string {
  return `${month}-01T00:00-0800`
}

const SHIPPING_REGION = 'Ships to the 48 contiguous US states and Washington, DC. Shipping and taxes are included in the price.'
const SEAT_NOTE = 'Each purchase uses one of the 100 S26 seats.'
const INITIATION_URL = `${SITE_URL}/voyager-initiation`

type FeedProductSpec = {
  kind: FeedKind
  id: string
  title: string
  summary: string
  /** Pack whose dispatch month marks the product as released (the Console for Complete). */
  releasePack: 1 | 2 | 3 | 4
  /**
   * Absolute JPEG/PNG photo of the actual product, or null. A product without
   * a real photo is left out of the feeds: generated concept art must not
   * stand in for what ships.
   */
  image: string | null
  isBundle: boolean
}

export const FEED_PRODUCTS: readonly FeedProductSpec[] = [
  {
    kind: 'initial',
    id: 'voyager-pack-initial',
    title: `${SITE_NAME} Initial Voyager Pack: Packs 1–2 with Badge and Console Antenna (Console Not Included)`,
    summary: 'The Initial Voyager Pack is a one-time purchase of Voyager membership and two physical Packs: a welcome letter, a Voyager badge and an Antenna for the Multiverse Console. It does not include the Console.',
    releasePack: 1,
    // Blocked: the current Pack 1 and Antenna images are generated or concept imagery.
    image: null,
    isBundle: false,
  },
  {
    kind: 'standard',
    id: 'voyager-pack-complete',
    title: `${SITE_NAME} Complete Voyager Pack: Multiverse Console Retro Sci-Fi Device and 4 Packs`,
    summary: 'The Complete Voyager Pack is a one-time purchase of Voyager membership and four physical Packs, including the Multiverse Console, a retro sci-fi device. Pack 4 contents are to be announced.',
    releasePack: 3,
    image: `${SITE_URL}/assets/device-console.jpg`,
    isBundle: true,
  },
]

export type ShoppingFeedItem = {
  id: string
  kind: FeedKind
  title: string
  description: string
  link: string
  image: string
  /** "38.00 USD" */
  price: string
  availability: FeedAvailability
  /** Set only for preorder: the planned dispatch of the release Pack. */
  availabilityDate: string | null
  isBundle: boolean
}

export function feedPrice(kind: FeedKind): string {
  return `${(INITIATION_PRICES[kind].amount / 100).toFixed(2)} USD`
}

function dispatchSentence(packs: readonly number[]): string {
  const planned = S26_DISPATCHES.filter((d) => packs.includes(d.pack))
    .map((d) => `${d.label}, ${dispatchMonthLabel(d.month)}`)
    .join('; ')
  return `Planned dispatch months: ${planned}. Packs whose month has passed ship together. Planned months are not guaranteed delivery dates.`
}

function feedAvailability(spec: FeedProductSpec, state: ShoppingFeedState): Pick<ShoppingFeedItem, 'availability' | 'availabilityDate'> {
  if (!state.checkoutOpen[spec.kind] || state.remainingSeats <= 0) return { availability: 'out_of_stock', availabilityDate: null }
  const release = S26_DISPATCHES.find((d) => d.pack === spec.releasePack)!
  const releaseAt = dispatchMonthStart(release.month)
  return state.now.getTime() < Date.parse(releaseAt)
    ? { availability: 'preorder', availabilityDate: releaseAt }
    : { availability: 'in_stock', availabilityDate: null }
}

/** Feed items for the Packs a new visitor can buy now (or see sold out). */
export function shoppingFeedItems(state: ShoppingFeedState): ShoppingFeedItem[] {
  return FEED_PRODUCTS.flatMap((spec) => {
    if (!spec.image) return []
    return [{
      id: spec.id,
      kind: spec.kind,
      title: spec.title,
      description: [spec.summary, dispatchSentence(INITIATION_PRICES[spec.kind].packs), SHIPPING_REGION, SEAT_NOTE, SITE_DESCRIPTION].join(' '),
      link: spec.kind === 'standard' ? `${INITIATION_URL}?bundle=standard` : INITIATION_URL,
      image: spec.image,
      price: feedPrice(spec.kind),
      ...feedAvailability(spec, state),
      isBundle: spec.isBundle,
    }]
  })
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

const GOOGLE_PRODUCT_CATEGORY = 'Toys & Games > Games'
const PRODUCT_TYPE = 'Sci-Fi Games > Hardware-Based Sci-Fi Game'

/** Google Merchant Center RSS 2.0 feed. Shipping, handling time and returns live in account settings. */
export function googleMerchantFeedXml(items: readonly ShoppingFeedItem[]): string {
  const tag = (name: string, value: string) => `      <g:${name}>${xmlEscape(value)}</g:${name}>`
  const entries = items.map((item) => [
    '    <item>',
    tag('id', item.id),
    tag('title', item.title),
    tag('description', item.description),
    tag('link', item.link),
    tag('image_link', item.image),
    tag('availability', item.availability),
    ...(item.availabilityDate ? [tag('availability_date', item.availabilityDate)] : []),
    tag('price', item.price),
    tag('brand', SITE_NAME),
    // Own-brand goods made for the Collective: no GTIN or manufacturer MPN exists.
    tag('identifier_exists', 'no'),
    tag('condition', 'new'),
    tag('is_bundle', item.isBundle ? 'yes' : 'no'),
    tag('google_product_category', GOOGLE_PRODUCT_CATEGORY),
    tag('product_type', PRODUCT_TYPE),
    '    </item>',
  ].join('\n'))
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '  <channel>',
    `    <title>${xmlEscape(SITE_NAME)}</title>`,
    `    <link>${xmlEscape(SITE_URL)}</link>`,
    `    <description>${xmlEscape(SITE_DESCRIPTION)}</description>`,
    ...entries,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}

const OPENAI_AVAILABILITY: Record<FeedAvailability, string> = { in_stock: 'in_stock', out_of_stock: 'out_of_stock', preorder: 'pre_order' }

/** One OpenAI product feed row. Search only: purchases complete on multiverseco.org. */
export function openAiFeedRecord(item: ShoppingFeedItem) {
  return {
    item_id: item.id,
    title: item.title,
    description: item.description,
    url: item.link,
    brand: SITE_NAME,
    seller_name: SITE_NAME,
    seller_url: SITE_URL,
    image_url: item.image,
    availability: OPENAI_AVAILABILITY[item.availability],
    price: item.price,
    condition: 'new',
    product_category: GOOGLE_PRODUCT_CATEGORY,
    target_countries: ['US'],
    store_country: 'US',
    shipping_price: '0.00 USD',
    return_policy: `${SITE_URL}/terms/initiation#refunds`,
    seller_tos: `${SITE_URL}/terms/initiation`,
    seller_privacy_policy: `${SITE_URL}/privacy`,
    is_eligible_search: true,
    is_eligible_checkout: false,
  }
}

export function openAiFeedJsonl(items: readonly ShoppingFeedItem[]): string {
  return items.map((item) => JSON.stringify(openAiFeedRecord(item))).join('\n') + (items.length ? '\n' : '')
}
