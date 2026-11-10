type CacheEntry<T> = { value: T; updatedAt: number }
const resetters = new Set<() => void>()

/** Called on account/permission changes. Never persist private reads to storage. */
export function clearClientDataCaches() {
  for (const reset of resetters) reset()
}

function makeCache<T>(staleTimeMs: number) {
  let entry: CacheEntry<T> | null = null
  let pending: Promise<T> | null = null
  let generation = 0
  return {
    peek(): T | undefined { return entry?.value },
    isFresh(now = Date.now()): boolean {
      return entry !== null && now - entry.updatedAt < staleTimeMs
    },
    set(value: T) {
      generation++
      pending = null
      entry = { value, updatedAt: Date.now() }
    },
    load(loader: () => Promise<T>, force = false): Promise<T> {
      if (!force && entry && Date.now() - entry.updatedAt < staleTimeMs) return Promise.resolve(entry.value)
      if (pending) return pending
      const version = generation
      // Defer the loader so synchronous failures follow the same cleanup path.
      const request = Promise.resolve().then(loader).then(value => {
        if (version === generation) entry = { value, updatedAt: Date.now() }
        return value
      }).finally(() => {
        if (pending === request) pending = null
      })
      pending = request
      return request
    },
    invalidate() { generation++; pending = null; if (entry) entry.updatedAt = -Infinity },
    clear() { generation++; entry = null; pending = null },
  }
}

/** Session-memory cache: retain stale content while revalidating in the background. */
export function createClientDataCache<T>(staleTimeMs: number) {
  const cache = makeCache<T>(staleTimeMs)
  resetters.add(cache.clear)
  return cache
}

/** Bounded LRU. Keys must include the account, permission scope and resource. */
export function createKeyedClientDataCache<T>(staleTimeMs: number, maxEntries = 24) {
  const entries = new Map<string, ReturnType<typeof makeCache<T>>>()
  const clear = () => { for (const cache of entries.values()) cache.clear() }
  resetters.add(clear)
  return {
    forKey(key: string) {
      const cache = entries.get(key) ?? makeCache<T>(staleTimeMs)
      entries.delete(key)
      entries.set(key, cache)
      if (entries.size > maxEntries) {
        const oldest = entries.keys().next().value!
        entries.get(oldest)!.clear()
        entries.delete(oldest)
      }
      return cache
    },
    clear,
    invalidate() { for (const cache of entries.values()) cache.invalidate() },
    update(transform: (value: T) => T) {
      for (const cache of entries.values()) {
        const value = cache.peek()
        if (value !== undefined) cache.set(transform(value))
      }
    },
  }
}
