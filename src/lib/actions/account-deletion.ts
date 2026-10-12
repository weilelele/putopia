'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { deleteLoopsContact } from '@/lib/loops'
import { DEVICE_SUPPORT_EMAIL } from '@/lib/device-purchase-terms'
import {
  DELETED_COMMENT_BODY, DELETED_MEMBER_NAME, isDeletionConfirmed, planCommentCleanup, tombstoneEmail,
} from '@/lib/account-deletion-model'

type Result = { error: string | null }
const STORAGE_BUCKETS = ['comment-images', 'avatars'] as const

/**
 * Deletes the signed-in member's account from inside the app (App Store
 * Guideline 5.1.1(v)).
 *
 *  1. Their discussion posts, world reports, images, avatar and mailing-list
 *     entry are removed (posts others replied to are blanked, not deleted).
 *  2. The auth user is deleted, which cascades their profile, votes, push
 *     devices and blocks. Order records are kept without a user link for
 *     fulfilment and tax purposes.
 *  3. If the database refuses (they still hold a device or allocation, which
 *     must keep pointing at a profile), the profile is scrubbed to a shell, the
 *     email is replaced with an unusable address and sign-in is disabled.
 */
export async function deleteMyAccount(confirmation: string): Promise<Result> {
  if (!isDeletionConfirmed(confirmation)) return { error: 'Type DELETE to confirm.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in again to delete your account.' }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin.from('voyager_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profileError || !profile) return { error: 'Your account could not be verified. Please try again.' }
  if (profile.role === 'architect') {
    return { error: `Architect accounts are handed over by the team first. Email ${DEVICE_SUPPORT_EMAIL}.` }
  }

  // Hide the account before any destructive cleanup. Retained membership/order
  // records still occupy their historical seat; deletion never releases inventory.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: visibilityError } = await (admin as any).from('account_deletions')
    .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
  if (visibilityError) return { error: 'Account deletion could not be started. Please try again.' }
  revalidatePath('/voyager-initiation')
  revalidatePath('/voyagers')

  // 1. Content ------------------------------------------------------------------
  const comments = admin.from('comments' as never) as ReturnType<typeof admin.from>
  const { data: own } = await comments.select('id').eq('author_id', user.id)
  const ownIds = ((own ?? []) as { id: string }[]).map((row) => row.id)
  if (ownIds.length) {
    const { data: replies } = await comments.select('parent_id').in('parent_id', ownIds)
    const plan = planCommentCleanup(ownIds, ((replies ?? []) as { parent_id: string | null }[]).map((r) => r.parent_id))
    if (plan.remove.length) await comments.delete().in('id', plan.remove)
    if (plan.blank.length) {
      await comments.update({
        author_id: null, author_name: DELETED_MEMBER_NAME, author_avatar_url: null,
        body: DELETED_COMMENT_BODY, image_paths: [],
      } as never).in('id', plan.blank)
    }
  }
  await (admin.from('world_reports' as never) as ReturnType<typeof admin.from>).delete().eq('author_id', user.id)

  for (const bucket of STORAGE_BUCKETS) {
    const { data: files } = await admin.storage.from(bucket).list(user.id, { limit: 1000 })
    if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`))
  }

  if (user.email) {
    await admin.from('applications').delete().eq('email', user.email)
    await deleteLoopsContact(user.email)
  }

  // 2. Account ------------------------------------------------------------------
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (!deleteError) { await supabase.auth.signOut(); return { error: null } }

  // 3. Fallback shell -----------------------------------------------------------
  console.warn('[account-deletion] hard delete refused, scrubbing profile instead:', deleteError.message)
  const { error: scrubError } = await admin.from('voyager_profiles').update({
    display_name: DELETED_MEMBER_NAME, bio: null, avatar_url: null, location: null,
    social_x: null, social_instagram: null, social_linkedin: null,
  }).eq('id', user.id)
  const { error: lockError } = await admin.auth.admin.updateUserById(user.id, {
    email: tombstoneEmail(user.id), ban_duration: '876000h', user_metadata: {},
  })
  if (scrubError || lockError) return { error: `We could not finish deleting your account. Email ${DEVICE_SUPPORT_EMAIL} and we will complete it.` }
  await supabase.auth.signOut()
  return { error: null }
}
