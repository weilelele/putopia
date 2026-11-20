import { describe, expect, it } from 'vitest'
import { INITIATION_PRICES } from './initiation-pricing'
import { SITE_URL } from './site-seo'
import {
  FEED_PRODUCTS, S26_DISPATCHES, dispatchMonthLabel, feedPrice, googleMerchantFeedXml,
  openAiFeedJsonl, shoppingFeedItems, type ShoppingFeedState,
} from './shopping-feed'
import { INITIATION_FAQ_GROUPS } from '@/app/voyager-initiation/faq'

const open = (overrides: Partial<ShoppingFeedState> = {}): ShoppingFeedState => ({
  remainingSeats: 40,
  checkoutOpen: { initial: true, standard: true },
  now: new Date('2026-11-20T12:00:00-08:00'),
  ...overrides,
})

describe('shopping feed mapping', () => {
  it('quotes the initiation page prices', () => {
    expect(feedPrice('initial')).toBe('38.00 USD')
    expect(feedPrice('standard')).toBe('488.00 USD')
    for (const item of shoppingFeedItems(open())) {
      expect(item.price).toBe(`${(INITIATION_PRICES[item.kind].amount / 100).toFixed(2)} USD`)
    }
  })

  it('lists only physical Packs, never Membership or the members-only upgrade', () => {
    const kinds = FEED_PRODUCTS.map((p) => p.kind as string)
    expect(kinds).not.toContain('membership')
    expect(kinds).not.toContain('legacy_upgrade')
  })

  it('leaves out a Pack until it has a real product photo', () => {
    const items = shoppingFeedItems(open())
    const withPhoto = FEED_PRODUCTS.filter((p) => p.image).map((p) => p.id)
    expect(items.map((i) => i.id)).toEqual(withPhoto)
    expect(items.every((i) => /\.(jpe?g|png)$/.test(i.image))).toBe(true)
  })

  it('marks the Complete Pack preorder until the Console dispatch month, then in stock', () => {
    const before = shoppingFeedItems(open()).find((i) => i.kind === 'standard')!
    expect(before.availability).toBe('preorder')
    expect(before.availabilityDate).toBe('2026-12-01T00:00-0800')
    const after = shoppingFeedItems(open({ now: new Date('2026-12-01T08:00:00Z') })).find((i) => i.kind === 'standard')!
    expect(after).toMatchObject({ availability: 'in_stock', availabilityDate: null })
  })

  it('reports out of stock when S26 seats are full or checkout is closed', () => {
    expect(shoppingFeedItems(open({ remainingSeats: 0 })).every((i) => i.availability === 'out_of_stock')).toBe(true)
    const closed = shoppingFeedItems(open({ checkoutOpen: { initial: true, standard: false } }))
    expect(closed.find((i) => i.kind === 'standard')).toMatchObject({ availability: 'out_of_stock', availabilityDate: null })
  })

  it('states dispatch timing, region and seat cap in every description', () => {
    for (const item of shoppingFeedItems(open())) {
      expect(item.description).toContain('Planned dispatch months:')
      expect(item.description).toContain('48 contiguous US states and Washington, DC')
      expect(item.description).toContain('100 S26 seats')
      expect(item.description.length).toBeLessThanOrEqual(5000)
      expect(item.title.length).toBeLessThanOrEqual(150)
    }
  })

  it('matches the dispatch schedule published in the initiation FAQ', () => {
    type FaqItem = { question: string; dispatches?: readonly { label: string; month: string }[] }
    const items = INITIATION_FAQ_GROUPS.flatMap((g): readonly FaqItem[] => g.items)
    const published = items.find((item) => item.dispatches)?.dispatches
    expect(S26_DISPATCHES.map((d) => ({ label: d.label, month: dispatchMonthLabel(d.month) }))).toEqual(published)
  })
})

describe('Google Merchant Center feed', () => {
  const xml = googleMerchantFeedXml(shoppingFeedItems(open()))

  it('is RSS 2.0 with the g: namespace and required attributes', () => {
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<rss version="2.0" xmlns:g="http:\/\/base.google.com\/ns\/1.0">/)
    for (const name of ['id', 'title', 'description', 'link', 'image_link', 'availability', 'price', 'brand', 'identifier_exists', 'condition']) {
      expect(xml).toContain(`<g:${name}>`)
    }
    expect(xml).toContain('<g:price>488.00 USD</g:price>')
    expect(xml).toContain('<g:availability_date>2026-12-01T00:00-0800</g:availability_date>')
    expect(xml).toContain(`<g:link>${SITE_URL}/voyager-initiation?bundle=standard</g:link>`)
  })

  it('escapes XML special characters', () => {
    expect(xml).toContain('Toys &amp; Games &gt; Games')
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/)
  })

  it('stays a valid empty channel when nothing is listable', () => {
    expect(googleMerchantFeedXml([])).toContain('<channel>')
  })
})

describe('OpenAI product feed', () => {
  const lines = openAiFeedJsonl(shoppingFeedItems(open())).trimEnd().split('\n')

  it('emits one JSON object per line with the required fields', () => {
    const rows = lines.map((line) => JSON.parse(line))
    for (const row of rows) {
      for (const field of ['item_id', 'title', 'description', 'url', 'brand', 'seller_name', 'image_url', 'availability', 'price']) {
        expect(row[field], field).toBeTruthy()
      }
      expect(row.target_countries).toEqual(['US'])
      expect(row.store_country).toBe('US')
      expect(row.is_eligible_checkout).toBe(false)
    }
    expect(rows.find((r) => r.item_id === 'voyager-pack-complete')).toMatchObject({ availability: 'pre_order', price: '488.00 USD' })
  })

  it('is empty, not a blank line, when nothing is listable', () => {
    expect(openAiFeedJsonl([])).toBe('')
  })
})
