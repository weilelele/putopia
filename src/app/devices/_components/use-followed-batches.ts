'use client'

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getMyDeviceBatchFollows } from '@/lib/actions/device-batch-notifications'
import {
  EMPTY_FOLLOWED_BATCHES_SNAPSHOT,
  getFollowedBatchesSnapshot,
  parseFollowedBatchSlugs,
  replaceFollowedBatchSlugs,
  subscribeToFollowChanges,
} from '@/lib/device-batch-follows'

let hydratedUserId: string | null = null
const hydrationByUser = new Map<string, Promise<void>>()

export function useFollowedBatchSlugs() {
  const { user } = useAuth()
  const snapshot = useSyncExternalStore(
    subscribeToFollowChanges,
    getFollowedBatchesSnapshot,
    () => EMPTY_FOLLOWED_BATCHES_SNAPSHOT,
  )

  useEffect(() => {
    if (!user.id || hydratedUserId === user.id) return
    const userId = user.id

    let hydrationPromise = hydrationByUser.get(userId)
    if (!hydrationPromise) {
      hydrationPromise = getMyDeviceBatchFollows()
        .then((slugs) => {
          if (!slugs) return
          replaceFollowedBatchSlugs(slugs)
          hydratedUserId = userId
        })
        .finally(() => {
          hydrationByUser.delete(userId)
        })
      hydrationByUser.set(userId, hydrationPromise)
    }

    void hydrationPromise
  }, [user.id])

  return useMemo(() => parseFollowedBatchSlugs(snapshot), [snapshot])
}
