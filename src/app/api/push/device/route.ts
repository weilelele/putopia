import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const TOKEN_PATTERN = /^[a-fA-F0-9]{32,256}$/

async function currentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ authenticated: false })

  const admin = createAdminClient()
  const [{ count }, { data: preferences }] = await Promise.all([
    (admin.from('push_devices' as never) as ReturnType<typeof admin.from>)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('enabled', true),
    (admin.from('push_preferences' as never) as ReturnType<typeof admin.from>)
      .select('replies, signal, worlds, votes, devices, intel, stories')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return NextResponse.json({ authenticated: true, deviceCount: count ?? 0, preferences })
}

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json().catch(() => null) as {
    token?: unknown
    environment?: unknown
    appId?: unknown
  } | null
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const environment = body?.environment === 'development' ? 'development' : 'production'
  const appId = body?.appId === 'org.multiverseco.collective'
    ? body.appId
    : 'org.multiverseco.collective'
  if (!TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ error: 'Invalid device token' }, { status: 400 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await (admin.from('push_devices' as never) as ReturnType<typeof admin.from>)
    .upsert({
      user_id: user.id,
      platform: 'ios',
      token,
      environment,
      app_id: appId,
      enabled: true,
      updated_at: now,
      last_seen_at: now,
    }, { onConflict: 'token' })
  if (error) return NextResponse.json({ error: 'Could not register device' }, { status: 500 })

  await (admin.from('push_preferences' as never) as ReturnType<typeof admin.from>)
    .upsert({ user_id: user.id, updated_at: now }, { onConflict: 'user_id', ignoreDuplicates: true })

  return NextResponse.json({ registered: true })
}

export async function DELETE(request: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json().catch(() => null) as { token?: unknown } | null
  const admin = createAdminClient()
  let query = (admin.from('push_devices' as never) as ReturnType<typeof admin.from>)
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
  if (typeof body?.token === 'string' && TOKEN_PATTERN.test(body.token)) {
    query = query.eq('token', body.token)
  }
  const { error } = await query
  if (error) return NextResponse.json({ error: 'Could not unregister device' }, { status: 500 })
  return NextResponse.json({ unregistered: true })
}

