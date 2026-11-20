/**
 * Plain-language explainer pages (/about/*) for buyers and AI answer engines.
 * Each page answers one family of buyer questions in its first paragraph, then
 * gives the same quick facts. Every fact here traces to a repo source; see
 * docs/marketing/geo/01-content-pages.zh.md. Prices are computed, never typed.
 */
import { INITIATION_PRICES, initiationPriceLabel } from './initiation-pricing'
import { ANTENNA } from './antenna-copy'
import { PARALLAX_ARRAY } from './parallax-array'
import { INITIATION_FAQ_GROUPS } from '@/app/voyager-initiation/faq'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site-seo'

export type GeoBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: readonly string[] }
  | { kind: 'compare'; typical: string; ours: string }

export type GeoSection = { id: string; heading: string; blocks: readonly GeoBlock[] }
export type GeoFaq = { question: string; answer: string }
export type GeoFact = { term: string; detail: string | readonly string[] }
export type GeoImage = { src: string; alt: string; width: number; height: number; caption: string }

export type GeoPage = {
  /** null is the /about hub. */
  slug: GeoSlug | null
  path: string
  /** Short name for breadcrumbs and related links. */
  label: string
  title: string
  metaTitle: string
  description: string
  answer: readonly string[]
  image?: GeoImage
  sections: readonly GeoSection[]
  faq: readonly GeoFaq[]
}

export const GEO_SLUGS = ['multiverse-console', 'sci-fi-gifts', 'sci-fi-game-at-home', 'how-it-compares'] as const
export type GeoSlug = (typeof GEO_SLUGS)[number]
export const GEO_PATHS = ['/about', ...GEO_SLUGS.map((slug) => `/about/${slug}`)] as const

export function isGeoSlug(value: string): value is GeoSlug {
  return (GEO_SLUGS as readonly string[]).includes(value)
}

type Options = { membershipEnabled: boolean }

const price = {
  membership: initiationPriceLabel('membership'),
  initial: initiationPriceLabel('initial'),
  complete: initiationPriceLabel('standard'),
  upgrade: initiationPriceLabel('legacy_upgrade'),
}
const savings = `$${(INITIATION_PRICES.initial.amount + INITIATION_PRICES.legacy_upgrade.amount - INITIATION_PRICES.standard.amount) / 100}`

const DISPATCHES = INITIATION_FAQ_GROUPS[2].items[0].dispatches
const month = (pack: number) => DISPATCHES[pack - 1].month

const CONSOLE_IMAGE: GeoImage = {
  src: '/assets/device-console.jpg',
  alt: 'Rendering of the Multiverse Console, a retro sci-fi device with tuning dials',
  width: 1280,
  height: 1023,
  caption: 'Multiverse Console rendering.',
}

const SHIPPING = 'Physical Packs ship to the 48 contiguous US states and Washington, DC. Shipping and taxes are included.'
const PLANNED = 'Dispatch months are planned, not guaranteed arrival dates.'
const ONE_TIME = 'Each option is a one-time payment. There is no subscription and no recurring fee.'
const VOYAGER_ACCESS = 'Mission Briefings, Parallax Array observation submissions, Classified Intel and Member Votes'
const MISSION_RULE = 'Voyagers can read the weekly Mission Briefings. Accepting and carrying out a mission requires a Multiverse Console bound to your account.'
const CONSOLE_SCHEDULE = `The Console is Pack 3 in the S26 schedule, planned for dispatch in ${month(3)}. ${PLANNED}`
const WORLD_LIFECYCLE = 'Worlds develop over time: Voyagers report signs of a world, tune its signals through observations and votes, and a confirmed world becomes an Established World in the World Records archive.'

export function priceSummary({ membershipEnabled }: Options): string {
  const packs = `The Initial Voyager Pack is ${price.initial}, and the Complete Voyager Pack, which includes the Multiverse Console, is ${price.complete}.`
  return membershipEnabled
    ? `Voyager Membership is ${price.membership} for digital access only. ${packs} Each is a one-time payment.`
    : `${packs} Each is a one-time payment.`
}

export function packContents(): string[] {
  return [
    `Pack 1, planned for ${month(1)}: a welcome letter and a Voyager badge.`,
    `Pack 2, planned for ${month(2)}: the ${ANTENNA.firstMention}. Installed on top of the Console, it receives a particular category of parallel-world signals. Images so far are design studies; final appearance and quantity are to be confirmed.`,
    `Pack 3, planned for ${month(3)}: the Multiverse Console.`,
    `Pack 4, planned for ${month(4)}: contents to be announced.`,
  ]
}

export function priceOptions({ membershipEnabled }: Options): string[] {
  return [
    ...(membershipEnabled ? [`${INITIATION_PRICES.membership.name}, ${price.membership}: Voyager access only. No physical Packs and no Console.`] : []),
    `${INITIATION_PRICES.initial.name}, ${price.initial}: Voyager access plus Packs 1–2. Does not include the Console.`,
    `${INITIATION_PRICES.standard.name}, ${price.complete}: Voyager access plus all four Packs, including the Multiverse Console.`,
    `Initial Voyager Pack owners can add ${INITIATION_PRICES.legacy_upgrade.name} later for ${price.upgrade}. Choosing Complete upfront costs ${savings} less.`,
  ]
}

export function quickFacts(options: Options): GeoFact[] {
  return [
    { term: 'What it is', detail: SITE_DESCRIPTION },
    { term: 'Who it is for', detail: 'Sci-fi fans who enjoy retro hardware, an ongoing story, and investigating parallel worlds together with other Voyagers. Physical Packs ship only within the 48 contiguous US states and Washington, DC.' },
    { term: 'Price', detail: priceOptions(options) },
    { term: 'Voyager access', detail: `${VOYAGER_ACCESS}. Included in every option.` },
    { term: 'What is in each Pack', detail: packContents() },
    { term: 'Shipping', detail: `${SHIPPING} ${PLANNED}` },
    { term: 'Payment', detail: `${ONE_TIME} Unshipped Packs are refundable.` },
    { term: 'Availability', detail: `S26, the first Voyager Initiation release, is limited to 100 seats${options.membershipEnabled ? ', and Voyager Membership uses one of them' : ''}. Live availability is shown on the Voyager Initiation page.` },
  ]
}

function aboutPage(options: Options): GeoPage {
  return {
    slug: null,
    path: '/about',
    label: 'About',
    title: 'What is Multiverse Collective?',
    metaTitle: 'What is Multiverse Collective? A hardware-based sci-fi game',
    description: 'Multiverse Collective is a hardware-based sci-fi game. Voyagers claim the Multiverse Console, a retro sci-fi device, to explore parallel worlds.',
    answer: [SITE_DESCRIPTION, priceSummary(options)],
    image: CONSOLE_IMAGE,
    sections: [
      { id: 'is-it-real', heading: 'Is it real?', blocks: [
        { kind: 'p', text: `${SITE_NAME} is a game. The parallel worlds are part of its story. The Multiverse Console, the Voyager Packs, the community of Voyagers and the votes they cast are real.` },
        { kind: 'p', text: 'Inside the experience, the Collective speaks in its own voice: members are Voyagers, and the Console is a device for looking into parallel worlds.' },
      ] },
      { id: 'what-voyagers-do', heading: 'What do Voyagers do?', blocks: [
        { kind: 'list', items: [
          'Tune the Multiverse Console. The left dial finds a world by its Frequency; the right dial switches between that world’s preset viewpoints, called Bands.',
          'Send energy into a world with the Quantum Energy Button. Some worlds also accept a short voice recording sent with the energy.',
          MISSION_RULE,
          PARALLAX_ARRAY.description,
          'Read Classified Intel, the Collective’s classified records and field briefings, and vote on what it does next.',
        ] },
      ] },
      { id: 'who-is-it-for', heading: 'Who is it for?', blocks: [
        { kind: 'p', text: 'Sci-fi fans who enjoy retro hardware and an ongoing story, and who like investigating with other people. You do not need the Console to start: every option includes Voyager access, and the Console comes with the Complete Voyager Pack.' },
        { kind: 'p', text: SHIPPING },
      ] },
      { id: 'what-it-is-not', heading: 'What it is not', blocks: [
        { kind: 'list', items: [
          `Not a subscription. ${ONE_TIME}`,
          'Not a random mystery box. The contents of Packs 1–3 are announced before you buy; only Pack 4 is still to be announced.',
          `Not a single puzzle with one solution. ${WORLD_LIFECYCLE}`,
        ] },
      ] },
    ],
    faq: [
      { question: 'Is Multiverse Collective a video game?', answer: 'It is a hardware-based sci-fi game. You play with a physical device, the Multiverse Console, together with the Multiverse Collective website, where Voyagers read briefings, submit observations and vote.' },
      { question: 'How much does Multiverse Collective cost?', answer: priceSummary(options) },
      { question: 'Is Multiverse Collective a subscription?', answer: `No. ${ONE_TIME}` },
      { question: 'Where does Multiverse Collective ship?', answer: SHIPPING },
      { question: 'When does the Multiverse Console ship?', answer: CONSOLE_SCHEDULE },
    ],
  }
}

function consolePage(options: Options): GeoPage {
  return {
    slug: 'multiverse-console',
    path: '/about/multiverse-console',
    label: 'Multiverse Console',
    title: 'The Multiverse Console',
    metaTitle: 'The Multiverse Console, a retro sci-fi device · Multiverse Collective',
    description: 'The Multiverse Console is a retro sci-fi device with two dials and a Quantum Energy Button, used to tune into parallel worlds in Multiverse Collective.',
    answer: [
      `The Multiverse Console is the physical device at the heart of ${SITE_NAME}, a hardware-based sci-fi game. Styled like a retro radio or television, it has two dials and a Quantum Energy Button: Voyagers tune into parallel worlds, switch viewpoints and send energy into them.`,
      `It is not sold on its own. It is Pack 3 of the Complete Voyager Pack (${price.complete}), planned for dispatch in ${month(3)}. Initial Voyager Pack owners can add ${INITIATION_PRICES.legacy_upgrade.name} for ${price.upgrade}.`,
    ],
    image: CONSOLE_IMAGE,
    sections: [
      { id: 'how-it-works', heading: 'How does it work?', blocks: [
        { kind: 'list', items: [
          'Left dial, Frequency: each Frequency value belongs to a different parallel world. One step of the dial moves the Frequency by 0.1.',
          'Right dial, Band: each world has a fixed set of preset camera viewpoints, called Bands. The dial switches between them; it does not move or zoom the camera freely.',
          'Remarks Band: one Band in each world carries that world’s introduction and notices.',
          'Quantum Energy Button: press and hold for at least 3 seconds to charge, then transmit energy into the world and Band you are watching. A short press does not transmit.',
          'Voice: in some worlds, holding the button also records a short message that is sent with the energy.',
        ] },
      ] },
      { id: 'what-you-see', heading: 'What do you see?', blocks: [
        { kind: 'p', text: 'Within about 0.1–0.2 of a world’s Frequency, a faint signal and a blurred picture appear. With no signal, the screen shows static. Tuning to the exact Frequency does not guarantee a clear picture.' },
        { kind: 'p', text: 'Energy may bring a blurred world into focus or change something on the other side, depending on that world. Neither is guaranteed: a successful transmission and a visible response are separate events.' },
      ] },
      { id: 'energy', heading: 'How does energy work?', blocks: [
        { kind: 'p', text: 'The Console stores energy, currently up to 10 points. Each transmission uses 1 point, and a Console left at rest for a while recovers 1 point at a time, up to the limit.' },
      ] },
      { id: 'still-being-defined', heading: 'What is still being defined?', blocks: [
        { kind: 'p', text: 'The 3-second charge and the 10-point capacity are current settings and may change. Details such as recovery time are still being decided, and Voyagers help the Collective uncover new capabilities.' },
      ] },
      { id: 'antenna', heading: 'What is the Antenna?', blocks: [
        { kind: 'p', text: `The ${ANTENNA.firstMention} is Pack 2. Installed on top of the Console, it receives a particular category of parallel-world signals. ${ANTENNA.requirement} ${ANTENNA.imageCaption}` },
      ] },
      { id: 'how-to-get-one', heading: 'How do I get one?', blocks: [
        { kind: 'list', items: [
          `Choose the Complete Voyager Pack (${price.complete}), which includes all four Packs.`,
          `Or, if you own the Initial Voyager Pack (${price.initial}), add ${INITIATION_PRICES.legacy_upgrade.name} for ${price.upgrade}.`,
          'After purchase, claim your Console on the Devices page by choosing an available batch.',
          SHIPPING,
        ] },
      ] },
    ],
    faq: [
      { question: 'Can I buy the Multiverse Console on its own?', answer: `No. It is included in the Complete Voyager Pack (${price.complete}), or as ${INITIATION_PRICES.legacy_upgrade.name} (${price.upgrade}) for Initial Voyager Pack owners.` },
      { question: 'Does the Multiverse Console do anything, or is it for display?', answer: 'It is an interactive device. Its dials tune into worlds and switch viewpoints, and its button sends energy into the world you are watching. What a world does in response depends on that world.' },
      { question: 'Do I need the Console to play Multiverse Collective?', answer: `Every option includes Voyager access: ${VOYAGER_ACCESS}. Accepting and carrying out missions requires a Multiverse Console bound to your account.` },
      { question: 'When will the Multiverse Console ship?', answer: CONSOLE_SCHEDULE },
      ...(options.membershipEnabled ? [{ question: 'Does Voyager Membership include the Console?', answer: `No. The ${price.membership} Voyager Membership includes no physical Packs and no Console claim. Your Membership payment is credited if you upgrade.` }] : []),
    ],
  }
}

function giftsPage(options: Options): GeoPage {
  return {
    slug: 'sci-fi-gifts',
    path: '/about/sci-fi-gifts',
    label: 'Gifts for sci-fi fans',
    title: 'A gift for sci-fi fans',
    metaTitle: 'A unique gift for sci-fi fans · Multiverse Collective',
    description: `A unique gift for sci-fi fans and people who have everything: a retro sci-fi device and an ongoing game about parallel worlds. Packs from ${price.initial}.`,
    answer: [
      `For a sci-fi fan, or someone who has everything, ${SITE_NAME} is a gift they can use: a hardware-based sci-fi game built around the Multiverse Console, a retro sci-fi device for tuning into parallel worlds, plus an ongoing story they explore with other Voyagers.`,
      `The Initial Voyager Pack (${price.initial}) sends a welcome letter, a Voyager badge and the Antenna. The Complete Voyager Pack (${price.complete}) adds the Console and a fourth Pack. ${SHIPPING}`,
    ],
    sections: [
      { id: 'what-they-receive', heading: 'What will they receive?', blocks: [
        { kind: 'list', items: priceOptions(options).slice(0, -1) },
        { kind: 'list', items: packContents() },
      ] },
      { id: 'timing', heading: 'When will it arrive?', blocks: [
        { kind: 'p', text: `Packs follow the S26 dispatch schedule: Pack 1 in ${month(1)}, Pack 2 in ${month(2)}, the Console in ${month(3)} and Pack 4 in ${month(4)}. ${PLANNED} A ${month(3)} dispatch does not promise delivery before the holidays.` },
        { kind: 'p', text: 'If you buy after a scheduled dispatch date, the earlier Packs in your bundle are sent together, and the rest follow the schedule.' },
      ] },
      { id: 'someone-who-has-everything', heading: 'Why it suits someone who has everything', blocks: [
        { kind: 'list', items: [
          'It does something. The Console tunes into worlds, switches viewpoints and sends energy, rather than sitting on a shelf.',
          'It keeps going after the box is opened: weekly Mission Briefings, Classified Intel and Member Votes.',
          'It is shared. Worlds develop through the observations and votes of many Voyagers.',
          'It is limited. S26, the first release, has 100 seats.',
        ] },
      ] },
      { id: 'before-you-buy', heading: 'Before you buy', blocks: [
        { kind: 'list', items: [
          `The Console is planned for dispatch in ${month(3)}.`,
          'Pack 4’s contents have not been announced.',
          `Antenna images are design studies; its final appearance and quantity are to be confirmed.`,
          'Accepting missions requires a Console bound to the Voyager’s account.',
          `${ONE_TIME} Unshipped Packs are refundable.`,
        ] },
      ] },
    ],
    faq: [
      { question: 'What makes Multiverse Collective different from other sci-fi gifts?', answer: 'Many sci-fi gifts are collectibles to display. The Multiverse Console is an interactive device inside an ongoing game: Voyagers tune into parallel worlds, send energy into them, and investigate what they find with other Voyagers.' },
      { question: 'How much does a Multiverse Collective gift cost?', answer: priceSummary(options) },
      { question: 'Will it arrive before the holidays?', answer: `${PLANNED} Under the S26 schedule, Packs 1–2 are planned for ${month(1)} and ${month(2)}, the Console for ${month(3)} and Pack 4 for ${month(4)}.` },
      { question: 'Is it a subscription?', answer: `No. ${ONE_TIME}` },
    ],
  }
}

function atHomePage(options: Options): GeoPage {
  return {
    slug: 'sci-fi-game-at-home',
    path: '/about/sci-fi-game-at-home',
    label: 'A sci-fi game at home',
    title: 'A sci-fi mystery to play at home',
    metaTitle: 'An interactive sci-fi mystery game to play at home · Multiverse Collective',
    description: 'Multiverse Collective is an interactive sci-fi game you play at home: decode signals from parallel worlds with a retro device and other Voyagers.',
    answer: [
      `${SITE_NAME} is an interactive sci-fi game you play at home and online. Voyagers investigate signals from parallel worlds: they tune a physical device, the Multiverse Console, read weekly Mission Briefings, describe worlds they have seen and vote together on what happens next.`,
      `It is not a single puzzle that ends once it is solved. ${WORLD_LIFECYCLE}`,
      priceSummary(options),
    ],
    sections: [
      { id: 'each-week', heading: 'What do you do?', blocks: [
        { kind: 'list', items: [
          'Read the weekly Mission Briefings.',
          PARALLAX_ARRAY.description,
          'Read Classified Intel and take part in Member Votes on what the Collective does next.',
          'With a Console: tune into worlds, switch between Bands, send energy, and accept and carry out missions.',
        ] },
      ] },
      { id: 'without-console', heading: 'Do you need the Console?', blocks: [
        { kind: 'p', text: `Not to start. Every option includes Voyager access: ${VOYAGER_ACCESS}. ${MISSION_RULE}` },
      ] },
      { id: 'together', heading: 'Is it solo or shared?', blocks: [
        { kind: 'p', text: 'Shared. Voyagers share what they observe, investigate the results together and vote on what comes next. The Collective is still learning what the signals contain.' },
      ] },
      { id: 'where', heading: 'Where can you play?', blocks: [
        { kind: 'p', text: `The online parts run on the ${SITE_NAME} website. ${SHIPPING}` },
      ] },
    ],
    faq: [
      { question: 'Is Multiverse Collective an alternate reality game (ARG)?', answer: 'It shares traits with ARGs: an in-world voice, signals to investigate and a community working together. It also has a physical device, the Multiverse Console, and access comes from a one-time Voyager purchase.' },
      { question: 'Can I play Multiverse Collective without the Console?', answer: `Yes, in part. Every option includes Voyager access: ${VOYAGER_ACCESS}. Accepting and carrying out missions requires a Multiverse Console bound to your account.` },
      { question: 'Does the story end?', answer: `It is not built around a single ending. ${WORLD_LIFECYCLE}` },
    ],
  }
}

function comparePage(): GeoPage {
  return {
    slug: 'how-it-compares',
    path: '/about/how-it-compares',
    label: 'How it compares',
    title: 'How Multiverse Collective compares',
    metaTitle: 'Multiverse Collective vs mystery boxes, puzzle games and ARGs',
    description: 'How Multiverse Collective, a hardware-based sci-fi game, differs from mystery boxes, subscription puzzle boxes, ARGs, app games and sci-fi props.',
    answer: [
      `${SITE_NAME} is a hardware-based sci-fi game, not a mystery box or a subscription. You pay once, the contents of Packs 1–3 are announced before you buy, and the centerpiece is an interactive device, the Multiverse Console, used in an ongoing world shared with other Voyagers.`,
      `It is not for everyone. The Console comes in the ${price.complete} Complete Voyager Pack, physical Packs ship only within the 48 contiguous US states and Washington, DC, and seats are limited.`,
    ],
    sections: [
      { id: 'mystery-boxes', heading: 'Mystery boxes', blocks: [
        { kind: 'compare', typical: 'The contents are a surprise, often random, and much of the appeal is the unboxing.', ours: 'Packs 1–3 are announced before you buy: a welcome letter and badge, the Antenna, then the Console. Only Pack 4 is still to be announced.' },
      ] },
      { id: 'subscription-boxes', heading: 'Subscription mystery and puzzle boxes', blocks: [
        { kind: 'compare', typical: 'A recurring charge for each new box or episode, with a story that usually resolves within that box or season.', ours: 'One payment, four dispatches on a published schedule, no recurring fee. The story continues online through briefings, Intel and votes.' },
      ] },
      { id: 'puzzle-games', heading: 'Escape-room and puzzle games', blocks: [
        { kind: 'compare', typical: 'A fixed set of puzzles with a known solution, played through once.', ours: `No single solution. ${WORLD_LIFECYCLE}` },
      ] },
      { id: 'args', heading: 'Alternate reality games (ARGs)', blocks: [
        { kind: 'compare', typical: 'An in-world story told across websites and messages, often free, with nothing physical to own.', ours: 'The same in-world voice and shared investigation, plus a physical device you own and a one-time Voyager purchase.' },
      ] },
      { id: 'app-games', heading: 'App and video games', blocks: [
        { kind: 'compare', typical: 'Played entirely on a phone, console or computer you already own.', ours: 'Played with a dedicated device, the Multiverse Console, alongside the website.' },
      ] },
      { id: 'props', heading: 'Sci-fi props and retro gadgets', blocks: [
        { kind: 'compare', typical: 'Made to look the part, mostly for display.', ours: 'The Console is styled like a retro radio or television and is used in play: its dials tune into worlds and switch viewpoints, and its button sends energy.' },
      ] },
      { id: 'may-not-fit', heading: 'Where it may not fit', blocks: [
        { kind: 'list', items: [
          `Price: the Console is only in the ${price.complete} Complete Voyager Pack, or the ${price.upgrade} upgrade for Initial owners.`,
          `Region: ${SHIPPING}`,
          `Timing: ${CONSOLE_SCHEDULE}`,
          'Seats: S26, the first release, is limited to 100 seats.',
          'Unfinished details: some Console settings may change, Pack 4 is still to be announced, and the Antenna’s final appearance is to be confirmed.',
          'Pace: it is built around weekly briefings and ongoing votes rather than a single session.',
        ] },
      ] },
    ],
    faq: [
      { question: 'Is Multiverse Collective a mystery box?', answer: 'No. The contents of Packs 1–3 are announced before you buy: a welcome letter and badge, the Antenna, and the Multiverse Console. Only Pack 4 is still to be announced.' },
      { question: 'Is Multiverse Collective a subscription box?', answer: `No. ${ONE_TIME} Packs ship on a published four-dispatch schedule.` },
      { question: 'Is it like an escape room in a box?', answer: `Not quite. There is no single solution to reach. ${WORLD_LIFECYCLE}` },
    ],
  }
}

export function geoPage(slug: GeoSlug | null, options: Options): GeoPage {
  switch (slug) {
    case null: return aboutPage(options)
    case 'multiverse-console': return consolePage(options)
    case 'sci-fi-gifts': return giftsPage(options)
    case 'sci-fi-game-at-home': return atHomePage(options)
    case 'how-it-compares': return comparePage()
  }
}

export function geoPages(options: Options): GeoPage[] {
  return [null, ...GEO_SLUGS].map((slug) => geoPage(slug, options))
}

/** Plain text for one block, as JSON-LD and tests read it. */
export function blockText(block: GeoBlock): string {
  switch (block.kind) {
    case 'p': return block.text
    case 'list': return block.items.join(' ')
    case 'compare': return `Typically: ${block.typical} Multiverse Collective: ${block.ours}`
  }
}

/** WebPage + BreadcrumbList + FAQPage, linked to the site-wide Organization and WebSite nodes. */
export function geoPageJsonLd(page: GeoPage) {
  const url = `${SITE_URL}${page.path}`
  const crumbs = [
    { name: SITE_NAME, url: SITE_URL },
    { name: 'About', url: `${SITE_URL}/about` },
    ...(page.slug ? [{ name: page.label, url }] : []),
  ]
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': page.slug ? 'WebPage' : 'AboutPage',
        '@id': `${url}#webpage`,
        url,
        name: page.title,
        description: page.description,
        inLanguage: 'en',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': `${SITE_URL}/#organization` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        ...(page.image ? { primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE_URL}${page.image.src}`, caption: page.image.alt } } : {}),
        mentions: { '@id': `${SITE_URL}/voyager-initiation#product` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, name: crumb.name, item: crumb.url })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: page.faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
      },
    ],
  }
}
