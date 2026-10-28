import { NextResponse } from 'next/server'
import { getDeviceRoom } from '@/lib/actions/device-room'

export const dynamic = 'force-dynamic'
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const { slug } = await params
    return NextResponse.json(await getDeviceRoom(slug), { headers })
  } catch {
    return NextResponse.json({ error: 'Device status could not be loaded.' }, { status: 503, headers })
  }
}
