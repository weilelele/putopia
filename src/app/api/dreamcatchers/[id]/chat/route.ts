import { NextRequest, NextResponse } from 'next/server'
import { readDreamcatcherChat } from '@/lib/dreamcatcher-chat'
import { isChatRoomId, parseChatCursor } from '@/lib/dreamcatcher-chat-model'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isChatRoomId(id)) return NextResponse.json({ error: 'Invalid Dreamcatcher.' }, { status: 400, headers })
  let cursor
  try { cursor = parseChatCursor(request.nextUrl.searchParams.get('before')) } catch {
    return NextResponse.json({ error: 'Invalid message cursor.' }, { status: 400, headers })
  }
  try {
    const page = await readDreamcatcherChat(id, cursor)
    if (!page) return NextResponse.json({ error: 'This Dreamcatcher is no longer public.' }, { status: 404, headers })
    return NextResponse.json(page, { headers })
  } catch {
    return NextResponse.json({ error: 'Messages could not be loaded. Please try again.' }, { status: 503, headers })
  }
}
