import { Suspense } from 'react'
import { getMcFunctions } from '@/lib/actions/mc-functions'
import { getGuestHeroStats } from '@/lib/actions/hero-stats'
import { getGuestSignalFeed } from '@/lib/actions/signal-feed'
import type { McFunction } from '@/types/database'
import ConsoleClient from '../console/console-client'

// ISR guest shell for /console. The proxy rewrites cookie-less requests here,
// so ~all guest pageviews are served straight from the CDN cache — zero
// function invocations on the hot path. Every data source below is an
// unstable_cache'd admin read (no cookies, no per-viewer content); the feed
// uses the guest bucket, which always strips gated bodies. 30s matches the
// feed cache, so page-level caching adds no extra staleness.
//
// Signed-in visitors never land here (the proxy only rewrites requests
// without an auth cookie, and redirects direct hits back to /console).
export const revalidate = 30

// Reached only via the rewrite — keep the internal path out of search results.
export const metadata = { robots: { index: false } }

export default async function GuestConsolePage() {
  const onErr = (where: string) => (e: unknown) => {
    console.error(`[console-guest] ${where} failed:`, (e as Error)?.message ?? e)
    return null
  }

  const [mcFunctions, heroStats, feed] = await Promise.all([
    getMcFunctions().catch(onErr('getMcFunctions')),
    getGuestHeroStats().catch(onErr('getGuestHeroStats')),
    getGuestSignalFeed().catch(onErr('getGuestSignalFeed')),
  ])

  return (
    <Suspense>
      <ConsoleClient
        initialUser={{ role: 'guest' }}
        initialMcFunctions={(mcFunctions ?? []) as McFunction[]}
        initialHeroStats={heroStats ?? null}
        initialFeed={feed ?? []}
        initialExperimentGroup={null}
      />
    </Suspense>
  )
}
