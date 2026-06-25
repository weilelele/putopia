import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser, isPushConfigured } from '@/lib/push/send'

export const dynamic = 'force-dynamic'

// POST /api/push/test — sends a test notification to the caller's own devices.
// Safe to expose to any logged-in user: it can only push to itself.
export async function POST() {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'Web Push not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await sendPushToUser(user.id, {
    title: 'Multiverse Collective',
    body: 'Notifications are live. The Console will reach you here.',
    url: '/',
    tag: 'mc-test',
  })

  return NextResponse.json({ ok: true, ...result })
}
