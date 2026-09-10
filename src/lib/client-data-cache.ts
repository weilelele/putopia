type CacheEntry<T> = {
  value: T
  updatedAt: number
}

/**
 * Small session-memory cache for client-side reads that still use Server
 * Actions. Route components can unmount between App Router navigations, while
 * this module-level cache remains alive for the lifetime of the document.
 */
export function createClientDataCache<T>(staleTimeMs: number) {
  let entry: CacheEntry<T> | null = null
  let pending: Promise<T> | null = null

  return {
    peek(): T | undefined {
      return entry?.value
    },

    isFresh(now = Date.now()): boolean {
      return entry !== null && now - entry.updatedAt < staleTimeMs
    },

    load(loader: () => Promise<T>, force = false): Promise<T> {
      if (!force && entry && Date.now() - entry.updatedAt < staleTimeMs) {
        return Promise.resolve(entry.value)
      }
      if (pending) return pending

      pending = loader()
        .then((value) => {
          entry = { value, updatedAt: Date.now() }
          return value
        })
        .finally(() => {
          pending = null
        })

      return pending
    },

    clear() {
      entry = null
      pending = null
    },
  }
}
