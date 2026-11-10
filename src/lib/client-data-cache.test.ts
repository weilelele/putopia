import { describe, expect, it, vi } from 'vitest'
import { createClientDataCache, createKeyedClientDataCache, clearClientDataCaches } from './client-data-cache'

describe('createClientDataCache', () => {
  it('reuses fresh data without calling the loader again', async () => {
    const cache = createClientDataCache<string[]>(60_000)
    const loader = vi.fn().mockResolvedValue(['first'])

    await expect(cache.load(loader)).resolves.toEqual(['first'])
    await expect(cache.load(loader)).resolves.toEqual(['first'])

    expect(loader).toHaveBeenCalledTimes(1)
    expect(cache.peek()).toEqual(['first'])
  })

  it('deduplicates concurrent loads', async () => {
    const cache = createClientDataCache<string[]>(60_000)
    let resolve!: (value: string[]) => void
    const loader = vi.fn(() => new Promise<string[]>((done) => { resolve = done }))

    const first = cache.load(loader)
    const second = cache.load(loader)
    await Promise.resolve()
    resolve(['shared'])

    await expect(Promise.all([first, second])).resolves.toEqual([['shared'], ['shared']])
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('allows a mutation to force a refresh', async () => {
    const cache = createClientDataCache<number>(60_000)
    const loader = vi.fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)

    await expect(cache.load(loader)).resolves.toBe(1)
    await expect(cache.load(loader, true)).resolves.toBe(2)
    expect(loader).toHaveBeenCalledTimes(2)
  })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

describe('navigation cache lifecycle', () => {
  it('keeps stale content readable during revalidation and after a failed refresh', async () => {
    const cache = createClientDataCache<string[]>(0)
    cache.set(['visible'])
    const response = deferred<string[]>()
    const refresh = cache.load(() => response.promise)
    expect(cache.peek()).toEqual(['visible'])
    response.reject(new Error('offline'))
    await expect(refresh).rejects.toThrow('offline')
    expect(cache.peek()).toEqual(['visible'])
    await expect(cache.load(async () => ['updated'])).resolves.toEqual(['updated'])
  })

  it('does not restore private data after account cache invalidation', async () => {
    const cache = createClientDataCache<string>(60_000)
    const response = deferred<string>()
    const old = cache.load(() => response.promise)
    clearClientDataCaches()
    response.resolve('previous account')
    await old
    expect(cache.peek()).toBeUndefined()
    await expect(cache.load(async () => 'current account')).resolves.toBe('current account')
  })

  it('an old completion cannot overwrite or release a newer pending request', async () => {
    const cache = createClientDataCache<string>(60_000)
    const oldResponse = deferred<string>()
    const newResponse = deferred<string>()
    const old = cache.load(() => oldResponse.promise)
    cache.clear()
    const current = cache.load(() => newResponse.promise)
    oldResponse.resolve('old')
    await old
    expect(cache.peek()).toBeUndefined()
    const duplicate = cache.load(async () => 'unexpected')
    expect(duplicate).toBe(current)
    newResponse.resolve('new')
    await current
    expect(cache.peek()).toBe('new')
  })

  it('a confirmed edit wins over a background refresh started before it', async () => {
    const cache = createClientDataCache<string>(60_000)
    const response = deferred<string>()
    const refresh = cache.load(() => response.promise)
    cache.set('edited')
    response.resolve('old body')
    await refresh
    expect(cache.peek()).toBe('edited')
  })

  it('can retry a synchronous loader failure', async () => {
    const cache = createClientDataCache<number>(60_000)
    await expect(cache.load(() => { throw new Error('failed') })).rejects.toThrow('failed')
    await expect(cache.load(async () => 2)).resolves.toBe(2)
  })

  it('isolates accounts, permission scopes and individual resources', () => {
    const cache = createKeyedClientDataCache<string>(60_000)
    cache.forKey('alice:voyager:list').set('private')
    expect(cache.forKey('alice:applicant:list').peek()).toBeUndefined()
    expect(cache.forKey('bob:voyager:list').peek()).toBeUndefined()
    expect(cache.forKey('alice:voyager:detail').peek()).toBeUndefined()
    clearClientDataCaches()
    expect(cache.forKey('alice:voyager:list').peek()).toBeUndefined()
  })

  it('bounds retained routes and evicts the least recently used snapshot', () => {
    const cache = createKeyedClientDataCache<number>(60_000, 2)
    cache.forKey('a').set(1)
    cache.forKey('b').set(2)
    expect(cache.forKey('a').peek()).toBe(1)
    cache.forKey('c').set(3)
    expect(cache.forKey('b').peek()).toBeUndefined()
  })
})

it('invalidates freshness after a write while preserving the loaded range', async () => {
  const store = createKeyedClientDataCache<string[]>(60_000)
  const cache = store.forKey('alice:feed')
  cache.set(['head','tail'])
  store.invalidate()
  expect(cache.peek()).toEqual(['head','tail'])
  expect(cache.isFresh()).toBe(false)
  const loader = vi.fn(async () => ['fresh head','tail'])
  await cache.load(loader)
  expect(loader).toHaveBeenCalledOnce()
})
