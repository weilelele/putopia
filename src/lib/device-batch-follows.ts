export const FOLLOWED_BATCHES_KEY = 'mc-followed-device-batches:v1'
export const EMPTY_FOLLOWED_BATCHES_SNAPSHOT = '[]'

const followListeners = new Set<() => void>()
let storageListenerAttached = false

export function parseFollowedBatchSlugs(snapshot: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(snapshot ?? EMPTY_FOLLOWED_BATCHES_SNAPSHOT)
    if (!Array.isArray(parsed)) return []

    return [
      ...new Set(parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)),
    ]
  } catch {
    return []
  }
}

export function getFollowedBatchesSnapshot() {
  if (typeof window === 'undefined') return EMPTY_FOLLOWED_BATCHES_SNAPSHOT

  try {
    return window.localStorage.getItem(FOLLOWED_BATCHES_KEY) ?? EMPTY_FOLLOWED_BATCHES_SNAPSHOT
  } catch {
    return EMPTY_FOLLOWED_BATCHES_SNAPSHOT
  }
}

function emitFollowChange() {
  followListeners.forEach((listener) => listener())
}

function handleStorageChange(event: StorageEvent) {
  if (event.key === FOLLOWED_BATCHES_KEY) emitFollowChange()
}

export function subscribeToFollowChanges(callback: () => void) {
  followListeners.add(callback)
  if (!storageListenerAttached) {
    window.addEventListener('storage', handleStorageChange)
    storageListenerAttached = true
  }

  return () => {
    followListeners.delete(callback)
    if (followListeners.size === 0) {
      window.removeEventListener('storage', handleStorageChange)
      storageListenerAttached = false
    }
  }
}

export function setBatchFollowed(slug: string, followed: boolean) {
  const batches = new Set(parseFollowedBatchSlugs(getFollowedBatchesSnapshot()))
  if (followed) batches.add(slug)
  else batches.delete(slug)

  try {
    window.localStorage.setItem(FOLLOWED_BATCHES_KEY, JSON.stringify([...batches]))
  } catch {
    return
  }

  emitFollowChange()
}

export function replaceFollowedBatchSlugs(slugs: string[]) {
  const normalized = [...new Set(slugs.filter((slug) => slug.length > 0))]
  try {
    window.localStorage.setItem(FOLLOWED_BATCHES_KEY, JSON.stringify(normalized))
  } catch {
    return
  }
  emitFollowChange()
}
