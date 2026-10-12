import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Live Chat has closed.', messages: [], nextCursor: null }, { status: 410, headers: { 'Cache-Control': 'no-store' } })
}
