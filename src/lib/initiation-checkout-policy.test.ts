import { describe, expect, it } from 'vitest'
import { initiationPolicyError, initiationShippingCountries, isInitiationShippingRegion } from './initiation-checkout-policy'
const approved = { termsApproved: 'true', fulfillmentApproved: 'true', shippingPolicy: 'included', taxPolicy: 'included', countries: 'US', siteUrl: 'https://example.test', termsUrl: 'https://example.test/terms/initiation' }
describe('payment launch policy', () => {
  it('requires explicit approval of final terms and fulfillment, not just a URL', () => {
    expect(initiationPolicyError(approved)).toBeNull()
    expect(initiationPolicyError({ ...approved, termsApproved: undefined })).toBeTruthy()
    expect(initiationPolicyError({ ...approved, fulfillmentApproved: 'false' })).toBeTruthy()
  })
  it.each([{ shippingPolicy: 'additional' }, { taxPolicy: 'additional' }, { countries: 'US,JP' }, { countries: 'US,' }, { countries: '' }, { countries: 'XX' }, { countries: 'US,US' }, { siteUrl: 'http://example.test' }, { termsUrl: 'https://evil.test/terms/initiation' }, { termsUrl: 'https://example.test/draft' }, { termsUrl: 'https://user:pass@example.test/terms/initiation' }])('fails closed for %j', change => expect(initiationPolicyError({ ...approved, ...change })).toBeTruthy())
  it('parses only a nonempty approved supported-country list', () => {
    expect(initiationShippingCountries('US, JP')).toEqual(['US','JP'])
    expect(initiationShippingCountries('us,JP')).toBeNull()
    expect(initiationShippingCountries('ZZ')).toBeNull()
  })
})

describe('contiguous US delivery', () => {
  it.each(['CA', 'NY', 'DC', 'TX', 'wa'])('accepts %s', state => expect(isInitiationShippingRegion({ country: 'US', state })).toBe(true))
  it.each(['AK', 'HI', 'PR', 'GU', 'VI', 'AA', 'AE', 'AP', '', null])('excludes %s', state => expect(isInitiationShippingRegion({ country: 'US', state })).toBe(false))
  it('rejects other countries', () => expect(isInitiationShippingRegion({ country: 'CA', state: 'CA' })).toBe(false))
})
