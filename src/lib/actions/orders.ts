'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export interface VoyagerOrder {
  id: string
  status: string
  amount: number | null
  batch_label: string | null
  recipient_name: string | null
  city: string | null
  state: string | null
  carrier: string | null
  tracking_number: string | null
  tracking_url: string | null
  shipped_at: string | null
  delivered_at: string | null
  paid_at: string | null
  created_at: string
}

/** All orders for the signed-in user, newest first (RLS limits to their own rows). */
export async function getMyOrders(): Promise<VoyagerOrder[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('voyager_orders') as any)
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (data as VoyagerOrder[]) ?? []
}

// ── Admin (architect-only) ──────────────────────────────────────────────────

export interface AdminOrder extends VoyagerOrder {
  email: string | null
  display_name: string | null
  stripe_session_id: string | null
  address_line1: string | null
  address_line2: string | null
  postal_code: string | null
  country: string | null
  phone: string | null
}

async function requireArchitect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: me } = await supabase
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return me?.role === 'architect'
}

/** All orders, newest first. Architect only. */
export async function getAllOrders(): Promise<AdminOrder[]> {
  if (!(await requireArchitect())) return []
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin.from('voyager_orders') as any)
    .select('*')
    .order('created_at', { ascending: false })
  return (data as AdminOrder[]) ?? []
}

/** Update fulfillment fields. Stamps shipped_at / delivered_at on status change. */
export async function updateOrderFulfillment(
  orderId: string,
  updates: {
    status?: string
    carrier?: string | null
    tracking_number?: string | null
    tracking_url?: string | null
  },
): Promise<{ error: string | null }> {
  if (!(await requireArchitect())) return { error: 'Forbidden' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {}
  if (updates.status !== undefined) {
    patch.status = updates.status
    if (updates.status === 'shipped') patch.shipped_at = new Date().toISOString()
    if (updates.status === 'delivered') patch.delivered_at = new Date().toISOString()
  }
  if (updates.carrier !== undefined) patch.carrier = updates.carrier
  if (updates.tracking_number !== undefined) patch.tracking_number = updates.tracking_number
  if (updates.tracking_url !== undefined) patch.tracking_url = updates.tracking_url

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('voyager_orders') as any).update(patch).eq('id', orderId)
  if (error) return { error: error.message }

  revalidatePath('/admin/orders')
  revalidatePath('/profile')
  return { error: null }
}

/**
 * Manually create a paid order for a user (by email) and provision their
 * Voyager membership. Used when payment happened outside the Stripe flow
 * (offline, gifted, etc.) or for testing.
 *
 * - If no account exists for the email, one is invited via Supabase.
 * - Idempotent: if the user is already a paid Voyager, still creates a new
 *   order row so you can record the physical shipment.
 */
export async function createOrderManually(params: {
  email: string
  amount?: number          // cents, default 1200
  note?: string            // internal note stored in display_name field
}): Promise<{ error: string | null; orderId?: string }> {
  if (!(await requireArchitect())) return { error: 'Forbidden' }

  const { provisionVoyagerMembership } = await import('@/lib/actions/membership')
  const { getCurrentBatch } = await import('@/lib/actions/membership')

  const email = params.email.trim().toLowerCase()
  const amount = params.amount ?? 1200
  const admin = createAdminClient()

  // Resolve or create the account
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  let authUser = list?.users?.find((u) => u.email?.toLowerCase() === email)

  if (!authUser) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://multiverseco.org'
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth/callback`,
    })
    if (inviteErr) return { error: `Could not invite ${email}: ${inviteErr.message}` }
    authUser = invited?.user ?? null
  }

  if (!authUser) return { error: `Failed to resolve account for ${email}` }

  const batch = await getCurrentBatch()

  // Create the order row (status=paid immediately)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderErr } = await (admin.from('voyager_orders') as any)
    .insert({
      user_id:    authUser.id,
      email,
      amount,
      currency:   'usd',
      status:     'paid',
      batch_label: batch,
      display_name: params.note?.trim() || null,
      stripe_session_id: `manual_${Date.now()}`,
      paid_at:    new Date().toISOString(),
    })
    .select('id')
    .single()

  if (orderErr) return { error: orderErr.message }

  // Provision Voyager membership (idempotent)
  const { error: provErr } = await provisionVoyagerMembership(authUser.id)
  if (provErr) return { error: provErr }

  revalidatePath('/admin/orders')
  revalidatePath('/profile')
  return { error: null, orderId: order?.id }
}
