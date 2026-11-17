import { sameOrigin, webPushDb } from '@/lib/push/web-server'

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!/^[0-9a-f-]{36}$/i.test(body?.token ?? '') || !['displayed', 'clicked'].includes(body?.event)) return new Response(null, { status: 400 })
  const column = body.event === 'clicked' ? 'clicked_at' : 'displayed_at'
  const { error } = await webPushDb().from('web_push_deliveries').update({ [column]: new Date().toISOString() }).eq('event_token', body.token).is(column, null)
  return new Response(null, { status: error ? 503 : 204 })
}
