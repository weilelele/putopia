import { describe, expect, it } from 'vitest'
import { captureInitiationMetaAttribution } from './initiation-meta-attribution'

describe('Initiation checkout browser attribution', () => {
  const origin = 'https://www.multiverseco.org'
  it('captures the browser cookies/IP with a fixed same-site purchase source', () => {
    const cookies: Record<string, string> = { _fbp: 'fb.1.1791900000000.1234', _fbc: 'fb.1.1791900000000.click-id' }
    expect(captureInitiationMetaAttribution(new Headers({
      'user-agent': 'Purchaser browser', 'x-vercel-forwarded-for': '203.0.113.7',
      'x-forwarded-for': '198.51.100.2, 198.51.100.3', 'referer': 'https://untrusted.example/source',
    }), name => cookies[name], origin)).toEqual({
      event_source_url: `${origin}/voyager-initiation`, client_ip_address: '203.0.113.7',
      client_user_agent: 'Purchaser browser', fbp: cookies._fbp, fbc: cookies._fbc,
    })
  })
  it('captures no advertising identifiers for the native iOS app', () => {
    expect(captureInitiationMetaAttribution(new Headers({ 'user-agent': 'Safari MultiverseCollective/1.0' }),
      () => 'fb.1.123.456', origin)).toEqual({ disabled: true })
  })
  it('bounds untrusted headers/cookies and rejects malformed IP/click values', () => {
    const captured = captureInitiationMetaAttribution(new Headers({
      'user-agent': 'A'.repeat(3000), 'x-forwarded-for': 'not-an-ip',
    }), name => name === '_fbp' ? 'fb.1.123.' + '1'.repeat(600) : 'untrusted data', origin)
    expect(captured.client_user_agent).toHaveLength(1024)
    expect(captured).not.toHaveProperty('client_ip_address')
    expect(captured).not.toHaveProperty('fbp')
    expect(captured).not.toHaveProperty('fbc')
  })
  it('supports existing proxy IP headers and validated IPv6', () => {
    expect(captureInitiationMetaAttribution(new Headers({ 'x-forwarded-for': '2001:db8::2, 203.0.113.7' }),
      () => undefined, origin).client_ip_address).toBe('2001:db8::2')
    expect(captureInitiationMetaAttribution(new Headers({ 'x-real-ip': '203.0.113.9' }),
      () => undefined, origin).client_ip_address).toBe('203.0.113.9')
  })
})
