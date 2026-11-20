import { describe, expect, it } from 'vitest'
import { GEO_PATHS, GEO_SLUGS, blockText, geoPage, geoPageJsonLd, geoPages, isGeoSlug, priceSummary, quickFacts } from './geo-pages'
import { SITE_DESCRIPTION, SITE_URL } from './site-seo'

const modes = [{ membershipEnabled: true }, { membershipEnabled: false }]
const pageText = (page: ReturnType<typeof geoPage>) => [
  ...page.answer,
  ...page.sections.flatMap((section) => [section.heading, ...section.blocks.map(blockText)]),
  ...page.faq.flatMap((item) => [item.question, item.answer]),
].join(' ')

describe('geo explainer pages', () => {
  it('lists one unique path, title and description per page', () => {
    const pages = geoPages({ membershipEnabled: true })
    expect(pages.map((page) => page.path)).toEqual([...GEO_PATHS])
    expect(new Set(pages.map((page) => page.metaTitle)).size).toBe(pages.length)
    expect(new Set(pages.map((page) => page.description)).size).toBe(pages.length)
    for (const page of pages) {
      expect(page.description.length).toBeLessThanOrEqual(160)
      expect(page.answer[0].length).toBeGreaterThan(0)
      expect(page.faq.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('opens the hub with the canonical definition', () => {
    for (const options of modes) expect(geoPage(null, options).answer[0]).toBe(SITE_DESCRIPTION)
  })

  it('takes prices from initiation pricing and hides Membership when it is off', () => {
    expect(priceSummary({ membershipEnabled: true })).toContain('Voyager Membership is $12')
    expect(priceSummary({ membershipEnabled: true })).toContain('$38')
    expect(priceSummary({ membershipEnabled: true })).toContain('$488')
    for (const page of geoPages({ membershipEnabled: false })) {
      expect(pageText(page)).not.toMatch(/\$12\b|Voyager Membership/)
    }
    const offFacts = JSON.stringify(quickFacts({ membershipEnabled: false }))
    expect(offFacts).not.toMatch(/\$12\b|Voyager Membership/)
    expect(offFacts).toContain('add Console + Pack 4 later for $460')
    expect(offFacts).toContain('costs $10 less')
  })

  it('states the dispatch schedule as planned, with the Antenna caveat', () => {
    const facts = JSON.stringify(quickFacts({ membershipEnabled: true }))
    expect(facts).toContain('Pack 3, planned for December 2026: the Multiverse Console.')
    expect(facts).toContain('Pack 4, planned for January 2027: contents to be announced.')
    expect(facts).toContain('final appearance and quantity are to be confirmed')
    expect(facts).toContain('not guaranteed arrival dates')
  })

  it('keeps public copy free of production notes and hype words', () => {
    for (const options of modes) {
      for (const page of geoPages(options)) {
        expect(pageText(page)).not.toMatch(/\[Fictional|Intel: https|TODO|best |#1|guaranteed to/i)
      }
    }
  })

  it('accepts only known slugs', () => {
    for (const slug of GEO_SLUGS) expect(isGeoSlug(slug)).toBe(true)
    expect(isGeoSlug('about')).toBe(false)
  })

  it('builds JSON-LD that mirrors the visible FAQ and links to the site graph', () => {
    const page = geoPage('how-it-compares', { membershipEnabled: true })
    const [webPage, breadcrumb, faq] = geoPageJsonLd(page)['@graph'] as unknown as [Record<string, unknown>, { itemListElement: { item: string }[] }, { mainEntity: { name: string }[] }]
    expect(webPage['@type']).toBe('WebPage')
    expect(webPage.isPartOf).toEqual({ '@id': `${SITE_URL}/#website` })
    expect(breadcrumb.itemListElement.at(-1)?.item).toBe(`${SITE_URL}/about/how-it-compares`)
    expect(faq.mainEntity.map((q) => q.name)).toEqual(page.faq.map((q) => q.question))
    expect(geoPageJsonLd(geoPage(null, { membershipEnabled: true }))['@graph'][0]['@type']).toBe('AboutPage')
  })
})
