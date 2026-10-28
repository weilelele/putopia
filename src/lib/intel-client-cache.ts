import { createKeyedClientDataCache } from './client-data-cache'
import type { IntelWithAvatar } from '@/types/database'

export const intelListCache = createKeyedClientDataCache<IntelWithAvatar[]>(30_000)
export const intelDetailCache = createKeyedClientDataCache<IntelWithAvatar | null>(30_000)
export const intelCommentCache = createKeyedClientDataCache<Record<string, number>>(30_000)
export function invalidateIntelClientCache() {
  intelListCache.clear()
  intelDetailCache.clear()
  intelCommentCache.clear()
}
