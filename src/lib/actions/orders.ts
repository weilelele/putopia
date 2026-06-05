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

/** The signed-in user's most recent order (RLS limits this to their own rows). */
export async function getMyLatestOrder(): Promise<VoyagerOrder | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('voyager_orders') as any)
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as VoyagerOrder | null) ?? null
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
