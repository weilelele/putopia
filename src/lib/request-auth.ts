import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/** One verified auth read per server render; no cross-request user cache. */
export const getRequestUser = cache(async () => {
  const client = await createClient()
  return client.auth.getUser()
})

export const getRequestIdentity = cache(async () => {
  const session = await getRequestUser()
  const user = session.data.user
  if (!user) return { ...session, profile: null, profileError: null }
  const client = await createClient()
  const { data: profile, error: profileError } = await client.from('voyager_profiles')
    .select('id, role, account_kind, registered_at, display_name, avatar_url')
    .eq('id', user.id).single()
  return { ...session, profile, profileError }
})
