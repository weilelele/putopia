import { describe, expect, it } from 'vitest'
import { INITIATION_PRICES } from './initiation-pricing'
import { faqAnswerText, faqPageJsonLd, initiationDescription, initiationProductJsonLd, serializeJsonLd } from './site-seo'
import { INITIATION_FAQ_GROUPS, MEMBERSHIP_FAQ_GROUPS } from '@/app/voyager-initiation/faq'

describe('site SEO structured data', () => {
  it('escapes markup so JSON-LD cannot close its script tag', () => {
    expect(serializeJsonLd({ text: '</script><script>alert(1)</script>' })).not.toContain('<')
  })

  it('lists only the offers sold on the initiation page, at current prices', () => {
    const withMembership = initiationProductJsonLd({ membershipEnabled: true, seatsFull: false }).offers
    expect(withMembership.map((o) => o.name)).toEqual([INITIATION_PRICES.membership.name, INITIATION_PRICES.initial.name, INITIATION_PRICES.standard.name])
    expect(withMembership.map((o) => o.price)).toEqual(['12.00', '38.00', '488.00'])
    expect(withMembership.every((o) => o.availability === 'https://schema.org/InStock')).toBe(true)
    expect(initiationProductJsonLd({ membershipEnabled: false, seatsFull: false }).offers).toHaveLength(2)
  })

  it('marks every offer sold out once the S26 seats are full', () => {
    const offers = initiationProductJsonLd({ membershipEnabled: true, seatsFull: true }).offers
    expect(offers.every((o) => o.availability === 'https://schema.org/SoldOut')).toBe(true)
  })

  it('mentions Membership only when the page sells it', () => {
    expect(initiationDescription({ membershipEnabled: true })).toContain('Voyager Membership')
    expect(initiationDescription({ membershipEnabled: false })).not.toContain('Membership')
  })

  it('flattens every rendered FAQ item into plain answer text', () => {
    const variants: Parameters<typeof faqPageJsonLd>[0][] = [INITIATION_FAQ_GROUPS, MEMBERSHIP_FAQ_GROUPS]
    for (const groups of variants) {
      const entities = faqPageJsonLd(groups).mainEntity
      expect(entities).toHaveLength(groups.flatMap((g) => g.items).length)
      for (const entity of entities) expect(entity.acceptedAnswer.text.length).toBeGreaterThan(20)
    }
    const shipping = faqAnswerText(INITIATION_FAQ_GROUPS[2].items[0])
    expect(shipping).toContain('Pack 3 · Multiverse Console: December 2026.')
  })
})
