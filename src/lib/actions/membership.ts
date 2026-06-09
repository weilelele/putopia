'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/actions/activity-events'

// Label of the batch that new paid Voyagers are auto-assigned to.
export async function getCurrentBatch(): Promise<string> {
  const admin = createAdminClient()
  // `batches` is newer than the generated Database types — cast past them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin.from('batches') as any)
    .select('label')
    .eq('is_current', true)
    .maybeSingle()
  return (data?.label as string | undefined) ?? 'Original Batch'
}

/**
 * Fired once a payment is confirmed. This is the single entry point the Stripe
 * webhook will call later; it is safe to call directly for testing now.
 *
 * Auto-behaviours, all idempotent:
 *   1. Ensure the Voyager Profile row exists (creating it if needed).
 *   2. Promote role → voyager, assign a member number, stamp member_since,
 *      and join the current batch (atomic, via provision_voyager()).
 *   3. Post a `voyager_activated` event to the Status feed (first time only).
 */
export async function provisionVoyagerMembership(userId: string): Promise<{
  error: string | null
  memberNo?: number
  batch?: string
  already?: boolean
}> {
  const admin = createAdminClient()

  // 1) Ensure a profile row exists — this is the user's Voyager Profile.
  const { data: profile } = await admin
    .from('voyager_profiles')
    .select('id, display_name, role')
    .eq('id', userId)
    .maybeSingle()

  let displayName = profile?.display_name as string | undefined
  if (!profile) {
    const { data: u } = await admin.auth.admin.getUserById(userId)
    const email = u?.user?.email ?? null
    displayName = email ? email.split('@')[0] : 'Voyager'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insErr } = await (admin.from('voyager_profiles') as any).insert({
      id: userId,
      display_name: displayName,
      role: 'applicant',
    })
    if (insErr) return { error: insErr.message }
  }

  // 2) Atomic promotion: role=voyager, member_no, current batch.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error: rpcErr } = await (admin as any).rpc('provision_voyager', {
    p_uid: userId,
  })
  if (rpcErr) return { error: rpcErr.message }
  const result = Array.isArray(rows) ? rows[0] : rows
  const memberNo = result?.member_no as number | undefined
  const batch = result?.batch_label as string | undefined
  const already = !!result?.already

  // 3) Status feed — only on first activation. Skip for architects.
  const existingRole = (profile as { role?: string } | null)?.role
  if (!already && existingRole !== 'architect') {
    // target_title encodes the Voyager sub-role.
    // "Device Seeker" = pack-purchase path (this function).
    // "World Builder"  = separate flow, wired in when that system is ready.
    logActivity({
      actor_id:     userId,
      actor_name:   displayName ?? 'Voyager',
      actor_role:   'voyager',
      event_type:   'voyager_activated',
      target_id:    userId,
      target_title: 'Become a new Voyager: Device Seeker',
      target_href:  '/voyagers',
      group_key:    'voyager_activations',
    })
  }

  revalidatePath('/voyagers')
  revalidatePath('/console')
  return { error: null, memberNo, batch, already }
}

/**
 * Architect-only manual trigger — promote an existing account to Voyager by
 * email. Used to exercise the whole flow before Stripe is wired in.
 */
export async function provisionVoyagerByEmail(email: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (me?.role !== 'architect') return { error: 'Forbidden' }

  const target = email.trim().toLowerCase()
  const admin = createAdminClient()
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const authUser = list?.users?.find((u) => u.email?.toLowerCase() === target)
  if (!authUser) return { error: `No account found for ${target}` }

  return provisionVoyagerMembership(authUser.id)
}
