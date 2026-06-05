// Temporary diagnostic endpoint — REMOVE after debugging.
// Architect only: attempts a test order insert and returns the raw Supabase response.
import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  const { data: me } = await supabase
    .from('voyager_profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'architect') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const admin = createAdminClient()

  // Test 1: can we read voyager_orders?
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: readData, error: readErr } = await (admin.from('voyager_orders') as any)
    .select('id').limit(1)

  // Test 2: try a real insert
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: insertData, error: insertErr } = await (admin.from('voyager_orders') as any)
    .insert({
      user_id: user.id,
      email: user.email,
      amount: 1200,
      currency: 'usd',
      status: 'paid',
      batch_label: 'debug_test',
      stripe_session_id: 'debug_' + Date.now(),
      paid_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  // Clean up test row if it succeeded
  if (insertData?.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('voyager_orders') as any).delete().eq('id', insertData.id)
  }

  return NextResponse.json({
    user_id: user.id,
    email: user.email,
    read: { data: readData, error: readErr ? { message: readErr.message, code: readErr.code, details: readErr.details, hint: readErr.hint } : null },
    insert: { data: insertData, error: insertErr ? { message: insertErr.message, code: insertErr.code, details: insertErr.details, hint: insertErr.hint } : null },
  })
}
