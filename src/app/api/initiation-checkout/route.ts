import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initiationConfigurationError } from '@/lib/initiation-config'
import { createInitiationCheckout } from '@/lib/initiation-checkout-session'

export const dynamic = 'force-dynamic'
/** Authenticated POST only. All purchase facts are resolved on the server. */
export async function POST(request: Request) {
  const configError = initiationConfigurationError()
  if (configError) return NextResponse.json({ error: configError }, { status: 503 })
  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL!).origin
  if (request.headers.get('origin') !== origin) return NextResponse.json({ error: 'Invalid checkout origin.' }, { status: 403 })
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Please log in before checkout.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  return createInitiationCheckout(request, origin, { id: user.id, email: user.email }, body, 'signed_in')
}
