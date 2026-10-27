import { describe, expect, it } from 'vitest'
import { ACTIVATION_TTL_MS, activationEmail, createActivationToken, readActivationToken, verifyActivationToken } from './activation-link'

const SECRET = 'test-secret'
const NOW = Date.UTC(2026, 9, 27, 12)

describe('activation tokens', () => {
  it('reads back the account and landing path until 24 hours pass', () => {
    const token = createActivationToken({ userId: 'user-1', next: '/voyager-initiation', now: NOW }, SECRET)
    expect(readActivationToken(token, SECRET, NOW)).toEqual({ userId: 'user-1', next: '/voyager-initiation', expiresAt: NOW + ACTIVATION_TTL_MS })
    // Reusable: reading it never consumes it.
    expect(readActivationToken(token, SECRET, NOW + ACTIVATION_TTL_MS - 1)?.userId).toBe('user-1')
    expect(readActivationToken(token, SECRET, NOW + ACTIVATION_TTL_MS)).toBeNull()
  })

  it('rejects tampered, foreign-secret and malformed tokens', () => {
    const token = createActivationToken({ userId: 'user-1', now: NOW }, SECRET)
    const [body, mac] = token.split('.')
    const forged = Buffer.from(JSON.stringify({ u: 'user-2', n: null, x: NOW + ACTIVATION_TTL_MS })).toString('base64url')
    expect(readActivationToken(`${forged}.${mac}`, SECRET, NOW)).toBeNull()
    expect(readActivationToken(token, 'other-secret', NOW)).toBeNull()
    expect(readActivationToken(`${body}.${mac}.x`, SECRET, NOW)).toBeNull()
    expect(readActivationToken('nonsense', SECRET, NOW)).toBeNull()
    expect(readActivationToken(undefined, SECRET, NOW)).toBeNull()
    for (const invalid of [`${forged}.${mac}`, token + '.x', 'nonsense', undefined]) {
      expect(verifyActivationToken(invalid, SECRET)).toBeNull()
    }
    expect(verifyActivationToken(token, 'other-secret')).toBeNull()
  })

  it('can identify a signed old link for status checks without allowing it to set credentials', () => {
    const token = createActivationToken({ userId: 'activated-user', now: NOW }, SECRET)
    expect(verifyActivationToken(token, SECRET)?.userId).toBe('activated-user')
    expect(readActivationToken(token, SECRET, NOW + ACTIVATION_TTL_MS)).toBeNull()
    expect(readActivationToken(token, SECRET, NOW + 365 * ACTIVATION_TTL_MS)).toBeNull()
  })

  it('drops a landing path that is not on this site', () => {
    const token = createActivationToken({ userId: 'user-1', next: 'https://evil.example', now: NOW }, SECRET)
    expect(readActivationToken(token, SECRET, NOW)?.next).toBeNull()
  })
})

describe('activationEmail', () => {
  it('links the button and the fallback URL, escaped', () => {
    const email = activationEmail('https://multiverseco.org/register?key=a.b&x=1', 'signup')
    expect(email.subject).toBe('Welcome to Multiverse Collective')
    expect(email.html.match(/href="https:\/\/multiverseco\.org\/register\?key=a\.b&amp;x=1"/g)).toHaveLength(2)
    expect(email.text).toContain('https://multiverseco.org/register?key=a.b&x=1')
  })

  it('uses the activation site for the logo and recovery page, including on previews', () => {
    const email = activationEmail('https://preview.example/register?key=k', 'signup')
    expect(email.html).toContain('src="https://preview.example/assets/vi-wordmark.png"')
    expect(email.html).toContain('href="https://preview.example/auth/expired"')
    expect(email.text).toContain('Get a new link: https://preview.example/auth/expired')
    expect(email.html).not.toContain('#preview')
  })

  it('tells Initiation buyers why the link came with their checkout', () => {
    expect(activationEmail('https://multiverseco.org/register?key=k', 'initiation').text).toContain('Voyager Initiation checkout')
  })
})
