'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { provisionVoyagerMembership } from '@/lib/membership-provisioning'

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
