import { NextRequest } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { runSignalRecall } from '@/lib/signal/recall'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Auth: a valid CRON_SECRET (Vercel Cron) OR an authenticated architect.
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

  const result = await runSignalRecall()
  return Response.json({ ok: true, ...result })
}
