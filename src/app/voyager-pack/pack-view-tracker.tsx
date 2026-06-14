'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

/**
 * Fires `voyager_pack_viewed` once when the pack page mounts.
 * Carries the visitor's experiment group + the CTA state they saw, so the
 * membership dashboard can split pack traffic by A/B group.
 */
export function PackViewTracker({ group, state }: { group: string; state: string }) {
  useEffect(() => {
    posthog.capture('voyager_pack_viewed', { experiment_group: group, cta_state: state })
  }, [group, state])
  return null
}
