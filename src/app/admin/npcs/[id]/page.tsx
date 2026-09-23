import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { requireNpcArchitect } from '@/lib/npc-repository'
import { NpcEditor } from '../npc-editor'
import styles from '../npcs.module.css'

export const dynamic = 'force-dynamic'

export default async function NpcDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireNpcArchitect()
  const { id } = await params
  const creating = id === 'new'
  if (!creating && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound()
  const admin = createAdminClient()
  const profile = creating ? null : await admin.from('voyager_profiles').select('id, display_name, role, bio, avatar_url, location').eq('account_kind', 'npc').eq('id', id).maybeSingle()
  if (profile?.error) throw new Error('Could not load NPC profile')
  if (!creating && !profile?.data) notFound()
  const [batches, units] = await Promise.all([
    admin.from('device_batches').select('slug, name, listing_quantity, claimed_quantity, reserved_quantity, allocated_quantity').eq('publication_status', 'published').order('name'),
    creating ? Promise.resolve({ data: [], error: null }) : admin.from('device_batch_units').select('user_id, batch_slug, unit_code').eq('user_id', id).not('allocation_id', 'is', null).eq('status', 'assigned'),
  ])
  return <section className={styles.page}>
    <Link href="/admin/npcs" className={styles.back}>← All NPCs</Link>
    <header className={styles.heading}><h1>{creating ? 'Create NPC' : 'Edit NPC'}</h1></header>
    {batches.error || units.error ? <p role="alert">Device information could not load. Please try again.</p> :
      <NpcEditor key={id} profile={profile?.data ?? undefined} batches={batches.data ?? []} units={units.data ?? []} />}
  </section>
}
