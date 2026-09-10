import { describe, expect, it, vi } from 'vitest'
import { createClientDataCache } from './client-data-cache'

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
