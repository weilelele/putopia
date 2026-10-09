import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
/** Closing new sales must never cancel previously created Stripe sessions. */
export async function POST() {
  return NextResponse.json({ error: 'Device sales have ended. Console access is now managed through Initiation entitlements.', href: '/voyager-initiation' }, { status: 410 })
}
export const GET = POST
