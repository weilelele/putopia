import 'server-only'

import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function requireStoryLabArchitect() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  return profile?.role === 'architect' ? user : null
}
