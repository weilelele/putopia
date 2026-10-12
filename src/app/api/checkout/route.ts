import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
/** Retired sales endpoint. Existing sessions remain owned by the legacy webhook. */
export async function GET() {
  return NextResponse.json({ error: 'The $12 Initial Voyager Pack is no longer for sale.', href: '/voyager-initiation' }, { status: 410 })
}
export const POST = GET
