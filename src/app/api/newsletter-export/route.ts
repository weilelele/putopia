import { NextRequest } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  getWeeklyNewsletterContent,
  buildDirectHtml,
  buildTaskGatedHtml,
  buildUnregisteredHtml,
} from '@/lib/newsletter'

export const dynamic = 'force-dynamic'

// Internal: returns the newsletter email HTML with ABSOLUTE URLs (unlike the
// /newsletter/* preview pages, which strip the domain). Used by the send script.
export async function GET(request: NextRequest) {
  // Auth: a valid CRON_SECRET (send script) OR an authenticated architect.
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  const hasCronSecret = !!secret && auth === `Bearer ${secret}`

  if (!hasCronSecret) {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    let isArchitect = false
    if (user) {
      const adminCheck = createAdminClient()
      const { data: profile } = await adminCheck
        .from('voyager_profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      isArchitect = profile?.role === 'architect'
    }
    if (!isArchitect) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const group = request.nextUrl.searchParams.get('group') ?? 'direct'
  const codename = request.nextUrl.searchParams.get('codename') ?? 'Voyager'
  const content = await getWeeklyNewsletterContent()

  let html: string
  if (group === 'task-gated') html = buildTaskGatedHtml(content, codename)
  else if (group === 'unregistered') html = buildUnregisteredHtml(content.activeUsers, content.devices)
  else html = buildDirectHtml(content, codename)

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
