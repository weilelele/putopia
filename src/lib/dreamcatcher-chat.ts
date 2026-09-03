import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import { CHAT_PAGE_SIZE, isChatRoomId, makeChatPage, type ChatCursor } from '@/lib/dreamcatcher-chat-model'
import type { Comment } from '@/types/database'

export async function isPublishedChatRoom(id: string): Promise<boolean> {
  if (!isChatRoomId(id)) return false
  const admin = createAdminClient()
  const { data, error } = await admin.from('dreamcatchers' as never)
    .select('id').eq('id', id).eq('is_public', true).maybeSingle()
  if (error) throw new Error('Could not check this Dreamcatcher.')
  return !!data
}

export async function readDreamcatcherChat(id: string, cursor: ChatCursor | null) {
  if (!await isPublishedChatRoom(id)) return null
  const admin = createAdminClient()
  let query = (admin.from('comments' as never) as ReturnType<typeof admin.from>)
    .select('id, created_at, subject_type, subject_id, author_id, author_name, author_avatar_url, body, is_visible, parent_id, image_paths')
    .eq('subject_type', 'dreamcatcher').eq('subject_id', id).eq('is_visible', true)
    .order('created_at', { ascending: false }).order('id', { ascending: false })
    .limit(CHAT_PAGE_SIZE + 1)
  if (cursor) query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`)
  const { data, error } = await query
  if (error) throw new Error('Could not load messages.')
  return makeChatPage((data ?? []) as Comment[])
}
