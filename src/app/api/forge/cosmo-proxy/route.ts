import { NextRequest } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

// Same-origin proxy so the admin browser (ffmpeg.wasm) can fetch Cosmo media
// without hitting CORS. Architect-only; host-allowlisted to prevent SSRF.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ALLOWED_HOST_SUFFIXES = ['pufflearn.com', 'aliyuncs.com']

export async function GET(req: NextRequest) {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('voyager_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'architect') return new Response('Forbidden', { status: 403 })

  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new Response('missing url', { status: 400 })
  let host: string
  try { host = new URL(url).host } catch { return new Response('bad url', { status: 400 }) }
  if (!ALLOWED_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`))) {
    return new Response('host not allowed', { status: 400 })
  }

  const res = await fetch(url)
  if (!res.ok || !res.body) return new Response(`upstream ${res.status}`, { status: 502 })
  return new Response(res.body, {
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/octet-stream',
      'cache-control': 'private, max-age=300',
    },
  })
}
