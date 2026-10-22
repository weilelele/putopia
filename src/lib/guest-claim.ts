import 'server-only'
import { createHmac } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'

export type GuestClaimResult = 'transferred' | 'nothing' | 'seat_owned' | 'needs_support'
export const GUEST_CLAIM_PATH = '/api/initiation-claim'

/** Claim-cookie signing key, derived so the service-role key itself never signs anything. */
export function guestClaimKey(): string {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update('guest-claim-key-v1').digest('base64url')
}

/** True when a registered (non-anonymous) account already uses this email. */
export async function hasRegisteredAccount(email: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data, error } = await admin.from('voyager_profiles').select('id').eq('email', email).eq('account_kind', 'human').limit(1)
  if (error) throw error
  return data.length > 0
}

/** Latest claimable order of an anonymous checkout account (schema_v109 moves the same one). */
export async function claimableGuestOrder(anonymousUserId: string): Promise<{ id: string; status: string; stripe_session_id: string | null } | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data, error } = await admin.from('initiation_orders').select('id,status,stripe_session_id').eq('user_id', anonymousUserId)
    .in('status', ['pending', 'payment_review', 'paid']).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return data
}

/**
 * After a claim finds nothing open: was the guest purchase already released
 * because this account holds a seat (capture-time duplicate check)?
 */
export async function guestPurchaseReleasedForSeat(anonymousUserId: string, accountId: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const [latest, seat] = await Promise.all([
    admin.from('initiation_orders').select('status').eq('user_id', anonymousUserId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('initiation_members').select('user_id').eq('user_id', accountId).eq('active', true).maybeSingle(),
  ])
  if (latest.error) throw latest.error
  if (seat.error) throw seat.error
  return latest.data?.status === 'canceled' && !!seat.data
}
