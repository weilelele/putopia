import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FeedDatabase } from './voyager-feed-database'
import { createClient } from '@/lib/supabase/server'
import type { FeedViewer } from './voyager-feed'

export async function feedSession() {
  const db = await createClient() as unknown as SupabaseClient<FeedDatabase>
  const { data: { user }, error } = await db.auth.getUser()
  if (error && error.name !== 'AuthSessionMissingError') throw new Error('Your session could not be verified. Please retry.')
  if (!user || user.is_anonymous) return { db, viewer: null }
  const { data: profile, error: profileError } = await db.from('voyager_profiles').select('id,role,account_kind,registered_at,display_name,avatar_url').eq('id', user.id).single()
  if (profileError || !profile) throw new Error('Your membership could not be verified. Please retry.')
  return { db, viewer: profile as FeedViewer }
}
