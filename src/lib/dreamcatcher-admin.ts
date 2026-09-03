import 'server-only'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { DreamcatcherPublicationRecord } from '@/lib/dreamcatcher-publication'

export async function requireDreamcatcherArchitect() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Architect access is required.')
  const { data, error } = await client.from('voyager_profiles')
    .select('role').eq('id', user.id).maybeSingle()
  if (error || data?.role !== 'architect') throw new Error('Architect access is required.')
  return user
}

export async function listAdminDreamcatchers(): Promise<DreamcatcherPublicationRecord[]> {
  await requireDreamcatcherArchitect()
  // The existing Dreamcatcher migration is not yet represented in Database.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (createAdminClient() as any).from('dreamcatchers')
    .select('id, slug, code, name, city, country, location, time_zone, status, round_duration_minutes, queue_capacity, is_public')
    .order('created_at', { ascending: true }).order('slug', { ascending: true })
  if (error) throw new Error('Could not load Dreamcatchers. Please try again.')
  return data ?? []
}
