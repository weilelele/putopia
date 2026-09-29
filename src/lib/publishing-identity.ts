import 'server-only'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

export type PublishingIdentity = {
  id: string
  name: string
  role: UserRole
}

/** Authenticate a real, human architect before any managed publishing action. */
export async function requirePublishingArchitect(): Promise<PublishingIdentity | null> {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null

  const { data } = await createAdminClient()
    .from('voyager_profiles')
    .select('display_name, role, account_kind')
    .eq('id', user.id)
    .maybeSingle()

  if (data?.role !== 'architect' || data.account_kind === 'npc') return null
  return { id: user.id, name: data.display_name, role: data.role }
}

/**
 * Resolve an attribution chosen by an architect. Empty/current-user selections
 * mean "publish as myself". Every other new selection must be an NPC.
 *
 * `legacyIdentityId` lets an existing human attribution survive an unrelated
 * edit, while preventing it from being newly assigned to another record.
 */
export async function resolvePublishingIdentity(
  selectedId: string | null | undefined,
  actor: PublishingIdentity,
  legacyIdentityId?: string | null,
): Promise<PublishingIdentity> {
  if (!selectedId || selectedId === actor.id) return actor

  let query = createAdminClient()
    .from('voyager_profiles')
    .select('id, display_name, role, account_kind')
    .eq('id', selectedId)

  if (selectedId !== legacyIdentityId) query = query.eq('account_kind', 'npc')
  const { data, error } = await query.maybeSingle()

  if (error || !data || (selectedId !== legacyIdentityId && data.account_kind !== 'npc')) {
    throw new Error('Only NPC identities can be selected for publishing.')
  }
  return { id: data.id, name: data.display_name, role: data.role }
}
