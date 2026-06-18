import { describe, it, expect } from 'vitest'
import type { OnboardingVariantRow } from '@/types/database'
import { resolveVariant, FALLBACK_COPY } from './onboarding-variants'

/** Build a row with sensible defaults; override only what a test cares about. */
function row(over: Partial<OnboardingVariantRow> = {}): OnboardingVariantRow {
  return {
    id: 'id',
    match_key: '',
    label: 'label',
    q1_headline: null,
    q2_headline: null,
    affirm_line1: null,
    affirm_line2: null,
    cta_invitation: null,
    cta_label: null,
    video_url: null,
    sort_order: 0,
    enabled: true,
    updated_at: '2026-01-01',
    ...over,
  }
}

describe('resolveVariant', () => {
  it('falls back to FALLBACK_COPY with key "default" when there are no rows', () => {
    const r = resolveVariant([], {})
    expect(r.key).toBe('default')
    expect(r.q1Headline).toBe(FALLBACK_COPY.q1Headline)
    expect(r.video).toBe(FALLBACK_COPY.video)
  })

  it('uses the default row (match_key === "") as the base and its label as the key', () => {
    const def = row({ match_key: '', label: 'baseline', q1_headline: 'Default Q1' })
    const r = resolveVariant([def], {})
    expect(r.key).toBe('baseline')
    expect(r.q1Headline).toBe('Default Q1')
    // null fields inherit from FALLBACK_COPY
    expect(r.ctaLabel).toBe(FALLBACK_COPY.ctaLabel)
  })

  it('matches utm_content exactly and layers the variant over the default', () => {
    const def = row({ match_key: '', label: 'baseline', q1_headline: 'Default Q1', cta_label: 'DEFAULT CTA' })
    const a3 = row({ match_key: 'a3', label: 'variant-a3', q1_headline: 'A3 Q1' })
    const r = resolveVariant([def, a3], { utmContent: 'a3' })
    expect(r.key).toBe('variant-a3')
    expect(r.q1Headline).toBe('A3 Q1')          // from variant
    expect(r.ctaLabel).toBe('DEFAULT CTA')        // inherited from default row
  })

  it('matches a variant key as a token inside a longer utm_content', () => {
    const a3 = row({ match_key: 'a3', label: 'variant-a3', q1_headline: 'A3 Q1' })
    const r = resolveVariant([a3], { utmContent: 'metaeyes_a3_v2' })
    expect(r.key).toBe('variant-a3')
    expect(r.q1Headline).toBe('A3 Q1')
  })

  it('is case-insensitive on the incoming value', () => {
    const a3 = row({ match_key: 'a3', label: 'variant-a3' })
    const r = resolveVariant([a3], { utmContent: 'A3' })
    expect(r.key).toBe('variant-a3')
  })

  it('ignores disabled variants', () => {
    const def = row({ match_key: '', label: 'baseline' })
    const a3 = row({ match_key: 'a3', label: 'variant-a3', enabled: false })
    const r = resolveVariant([def, a3], { utmContent: 'a3' })
    expect(r.key).toBe('baseline')
  })

  it('prefers the override over utm_content', () => {
    const a3 = row({ match_key: 'a3', label: 'variant-a3' })
    const b7 = row({ match_key: 'b7', label: 'variant-b7' })
    const r = resolveVariant([a3, b7], { utmContent: 'a3', override: 'b7' })
    expect(r.key).toBe('variant-b7')
  })

  it('returns the default when nothing matches', () => {
    const def = row({ match_key: '', label: 'baseline' })
    const a3 = row({ match_key: 'a3', label: 'variant-a3' })
    const r = resolveVariant([def, a3], { utmContent: 'zz' })
    expect(r.key).toBe('baseline')
  })
})
