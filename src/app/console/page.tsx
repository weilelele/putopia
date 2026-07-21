import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getMcFunctions } from '@/lib/actions/mc-functions'
import { getGuestHeroStats } from '@/lib/actions/hero-stats'
import { getSignalFeed } from '@/lib/actions/signal-feed'
import { getOrAssignExperimentGroup } from '@/lib/actions/experiment'
import type { AuthUser } from '@/lib/auth-context'
import type { McFunction } from '@/types/database'
import ConsoleClient from './console-client'

export const dynamic = 'force-dynamic'

// Resolve the viewer server-side so the client renders the right hero on first
// paint (no blank-hero flash while the auth context boots on the phone).
async function getInitialUser(): Promise<AuthUser> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { role: 'guest' }

  const { data: profile } = await supabase
    .from('voyager_profiles')
    .select('role, display_name, avatar_url')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    role: profile?.role ?? 'applicant',
    email: user.email,
    name: profile?.display_name ?? undefined,
    avatarUrl: profile?.avatar_url ?? null,
  }
}

// Server shell: everything the dashboard needs for first paint is fetched here
// in parallel (each call is served from its unstable_cache bucket most of the
// time) and streamed down as initial props, so the phone gets a full-height,
// content-complete page in ONE round trip instead of hydrate → 4 serial
// server-action POSTs. A failed section degrades to its empty state rather
// than failing the page.
export default async function ConsolePage() {
  const onErr = (where: string) => (e: unknown) => {
    console.error(`[console] ${where} failed:`, (e as Error)?.message ?? e)
    return null
  }

  const [initialUser, mcFunctions, heroStats, feed, experimentGroup] = await Promise.all([
    getInitialUser().catch(() => ({ role: 'guest' } as AuthUser)),
    getMcFunctions().catch(onErr('getMcFunctions')),
    getGuestHeroStats().catch(onErr('getGuestHeroStats')),
    getSignalFeed().catch(onErr('getSignalFeed')),
    getOrAssignExperimentGroup().catch(onErr('getOrAssignExperimentGroup')),
  ])

  return (
    <Suspense>
      <ConsoleClient
        initialUser={initialUser}
        initialMcFunctions={(mcFunctions ?? []) as McFunction[]}
        initialHeroStats={heroStats ?? null}
        initialFeed={feed ?? []}
        initialExperimentGroup={experimentGroup ?? null}
      />
    </Suspense>
  )
}
