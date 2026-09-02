import { NextRequest } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { publishDueStoryContent } from '@/lib/story-workflow-repository'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')
  const hasCronSecret = Boolean(secret) && authorization === `Bearer ${secret}`

  if (!hasCronSecret) {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    let isArchitect = false
    if (user) {
      const admin = createAdminClient()
      const { data: profile } = await admin
        .from('voyager_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      isArchitect = profile?.role === 'architect'
    }
    if (!isArchitect) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await publishDueStoryContent()
  return Response.json({ ok: result.errors.length === 0, ...result })
}
