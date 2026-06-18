import { NextRequest } from 'next/server'
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
  const group = request.nextUrl.searchParams.get('group') ?? 'direct'
  const codename = request.nextUrl.searchParams.get('codename') ?? 'Voyager'
  const content = await getWeeklyNewsletterContent()

  let html: string
  if (group === 'task-gated') html = buildTaskGatedHtml(content, codename)
  else if (group === 'unregistered') html = buildUnregisteredHtml(content.activeUsers, content.devices)
  else html = buildDirectHtml(content, codename)

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
