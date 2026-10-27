import { describe, expect, it } from 'vitest'
import { rememberPostRegisterRedirect, takePostRegisterRedirect } from './post-register-redirect'

const ORIGIN = 'https://multiverseco.org'
const NOW = 1_800_000_000_000
function memoryStore() {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) }
}

describe('post-register redirect', () => {
  it('returns the remembered app path once', () => {
    const store = memoryStore()
    rememberPostRegisterRedirect(store, '/voyager-initiation?bundle=standard', ORIGIN, NOW)
    expect(takePostRegisterRedirect(store, ORIGIN, NOW + 1000)).toBe('/voyager-initiation?bundle=standard')
    expect(takePostRegisterRedirect(store, ORIGIN, NOW + 2000)).toBeNull()
  })

  it('ignores other origins, auth pages and stale entries', () => {
    const store = memoryStore()
    rememberPostRegisterRedirect(store, 'https://evil.example/steal', ORIGIN, NOW)
    expect(takePostRegisterRedirect(store, ORIGIN, NOW)).toBeNull()
    rememberPostRegisterRedirect(store, '/login?redirect=/console', ORIGIN, NOW)
    expect(takePostRegisterRedirect(store, ORIGIN, NOW)).toBeNull()
    rememberPostRegisterRedirect(store, '/voyager-initiation', ORIGIN, NOW)
    expect(takePostRegisterRedirect(store, ORIGIN, NOW + 8 * 24 * 60 * 60 * 1000)).toBeNull()
  })

  it('survives unavailable or corrupt storage', () => {
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => {} }
    expect(() => rememberPostRegisterRedirect(broken, '/voyager-initiation', ORIGIN, NOW)).not.toThrow()
    expect(takePostRegisterRedirect(broken, ORIGIN, NOW)).toBeNull()
    const store = memoryStore()
    store.setItem('mc:post-register-redirect', '{not json')
    expect(takePostRegisterRedirect(store, ORIGIN, NOW)).toBeNull()
  })
})
