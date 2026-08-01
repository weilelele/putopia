import { NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push/apns'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'architect') {
    return NextResponse.json({ error: 'Architect access required' }, { status: 403 })
  }

  const result = await sendPushToUser(user.id, {
    eventType: 'test',
    title: 'MULTIVERSE SIGNAL ONLINE',
    body: 'Push notifications are connected. Tap to return to the Console.',
    route: '/console?source=push_test',
  })
  return NextResponse.json(result, { status: result.configured ? 200 : 503 })
}
