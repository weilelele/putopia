import { createAdminClient } from '@/lib/supabase/server'
import { requireNpcArchitect } from '@/lib/npc-repository'
import { NpcSettings } from './npc-settings'

export const dynamic = 'force-dynamic'

export default async function NpcsPage() {
  await requireNpcArchitect()
  const admin = createAdminClient()
  const [profiles, batches, units] = await Promise.all([
    admin.from('voyager_profiles').select('id, display_name, bio, avatar_url, location').eq('account_kind', 'npc').order('joined_at'),
    admin.from('device_batches').select('slug, name, listing_quantity, claimed_quantity, reserved_quantity, allocated_quantity').eq('publication_status', 'published').order('name'),
    admin.from('device_batch_units').select('user_id, batch_slug, unit_code').not('allocation_id', 'is', null).eq('status', 'assigned'),
  ])
  if (profiles.error || batches.error || units.error) {
    return <section><h1>NPC settings</h1><p role="alert">NPC settings could not load. Check the database connection and apply schema_v71 before using this page.</p></section>
  }
  return <NpcSettings profiles={profiles.data ?? []} batches={batches.data ?? []} units={units.data ?? []} />
}
