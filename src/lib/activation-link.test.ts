import { describe, expect, it } from 'vitest'
import { ACTIVATION_TTL_MS, activationEmail, createActivationToken, readActivationToken } from './activation-link'

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
  })

  it('drops a landing path that is not on this site', () => {
    const token = createActivationToken({ userId: 'user-1', next: 'https://evil.example', now: NOW }, SECRET)
    expect(readActivationToken(token, SECRET, NOW)?.next).toBeNull()
  })
})

describe('activationEmail', () => {
  it('links the button and the fallback URL, escaped', () => {
    const email = activationEmail('https://multiverseco.org/register?key=a.b&x=1', 'signup')
    expect(email.subject).toBe('Activate your Multiverse Collective account')
    expect(email.html).toContain('href="https://multiverseco.org/register?key=a.b&amp;x=1"')
    expect(email.text).toContain('https://multiverseco.org/register?key=a.b&x=1')
  })

  it('tells Initiation buyers why the link came with their checkout', () => {
    expect(activationEmail('https://multiverseco.org/register?key=k', 'initiation').text).toContain('Voyager Initiation checkout')
  })
})
