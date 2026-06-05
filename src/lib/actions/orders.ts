'use server'

import { createClient } from '@/lib/supabase/server'

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
