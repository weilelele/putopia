import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { requireNpcArchitect } from '@/lib/npc-repository'
import styles from './npcs.module.css'

export const dynamic = 'force-dynamic'

export default async function NpcsPage() {
  await requireNpcArchitect()
  const admin = createAdminClient()
  const [profiles, units] = await Promise.all([
    admin.from('voyager_profiles').select('id, display_name, role, avatar_url, location').eq('account_kind', 'npc').order('joined_at'),
    admin.from('device_batch_units').select('user_id').not('allocation_id', 'is', null).eq('status', 'assigned'),
  ])
  if (profiles.error || units.error) {
    return <section><h1>NPC settings</h1><p role="alert">NPC settings could not load. Please try again.</p></section>
  }
  const counts = new Map<string, number>()
  for (const unit of units.data ?? []) {
    if (unit.user_id) counts.set(unit.user_id, (counts.get(unit.user_id) ?? 0) + 1)
  }
  return <section className={styles.page}>
    <header className={styles.heading}><h1>NPC settings · {profiles.data.length}</h1><Link href="/admin/npcs/new" className="archive-button archive-button--primary">Create NPC</Link></header>
    <p>Select a character to edit their profile and manage devices.</p>
    {!profiles.data.length && <p>No NPCs yet. Create a character to get started.</p>}
    <ul className={styles.list}>
      {profiles.data.map((profile) => {
        const count = counts.get(profile.id) ?? 0
        return <li key={profile.id}>
          <Link href={`/admin/npcs/${profile.id}`} className={styles.row}>
            <span className={styles.portrait} aria-hidden="true">
              {profile.avatar_url?.startsWith('https://') ?
                /* eslint-disable-next-line @next/next/no-img-element -- NPC avatars support administrator-supplied HTTPS URLs. */
                <img src={profile.avatar_url} alt="" width={44} height={44} /> : profile.display_name.slice(0, 1)}
            </span>
            <span className={styles.identity}><strong>{profile.display_name}</strong><span>{profile.role.toUpperCase()} · {profile.location || 'Location not set'}</span></span>
            <span className={styles.count}>{count} {count === 1 ? 'device' : 'devices'}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </li>
      })}
    </ul>
  </section>
}
