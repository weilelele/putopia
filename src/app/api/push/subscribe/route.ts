import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST /api/push/subscribe
// Body: a PushSubscription JSON (from pushManager.subscribe()).
// Stores it against the logged-in user, keyed by endpoint (upsert).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let sub: unknown
  try {
    sub = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const endpoint =
    typeof sub === 'object' && sub !== null ? (sub as { endpoint?: unknown }).endpoint : undefined
  const keys =
    typeof sub === 'object' && sub !== null
      ? (sub as { keys?: { p256dh?: unknown; auth?: unknown } }).keys
      : undefined

  if (
    typeof endpoint !== 'string' ||
    typeof keys?.p256dh !== 'string' ||
    typeof keys?.auth !== 'string'
  ) {
    return NextResponse.json({ error: 'Malformed subscription' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: req.headers.get('user-agent'),
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
