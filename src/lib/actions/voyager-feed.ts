'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { feedSession } from '@/lib/voyager-feed-server'
import { canReadVoyagerFeed, canPublishVoyagerFeed, canPublishAsNpc, validateFeedBody, validateFeedCursor, validFeedId, FEED_LIMIT, type FeedCursor, type FeedPage } from '@/lib/voyager-feed'
import { getAllNpcIdentities } from '@/lib/npc-repository'
import { resolvePublishingIdentity } from '@/lib/publishing-identity'
import { validateAvatar } from '@/lib/profile-validation'

export async function getVoyagerFeed(parentId?: string, cursor?: FeedCursor): Promise<FeedPage> {
  const { db, viewer } = await feedSession()
  if (!canReadVoyagerFeed(viewer)) return { viewer, entries: [], next: null, locked: true }
  if (parentId && !validFeedId(parentId)) throw new Error('Post unavailable.')
  const page = validateFeedCursor(cursor)
  let query = db.from('voyager_feed_view').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(FEED_LIMIT + 1)
  query = parentId ? query.eq('parent_id', parentId) : query.is('parent_id', null)
  if (page) query = query.or(`created_at.lt.${page.created_at},and(created_at.eq.${page.created_at},id.lt.${page.id})`)
  const { data, error } = await query
  if (error) throw new Error('The feed could not be loaded. Please try again.')
  const entries = (data ?? []).slice(0, FEED_LIMIT)
  const last = entries.at(-1)
  let post = null
  if (parentId) {
    const result = await db.from('voyager_feed_view').select('*').eq('id', parentId).is('parent_id', null).maybeSingle()
    if (result.error) throw new Error('The post could not be loaded. Please try again.')
    post = result.data
  }
  return { viewer, entries, next: data && data.length > FEED_LIMIT && last ? { id: last.id, created_at: last.created_at } : null, locked: false, post }
}

export async function getFeedPublishingIdentities() {
  const { viewer } = await feedSession()
  if (!canPublishAsNpc(viewer)) throw new Error('Architect permission required.')
  return (await getAllNpcIdentities()).map(({ id, display_name, avatar_url }) => ({ id, display_name, avatar_url }))
}

// Owner-scoped lookup is separate from retries: a missing row is not proof that
// an earlier timed-out request has stopped running.
export async function getVoyagerSubmission(id: string) {
  const { db, viewer } = await feedSession()
  if (!viewer || !canReadVoyagerFeed(viewer) || !validFeedId(id)) throw new Error('Your access could not be verified. Log in and try again.')
  const { data, error } = await db.from('voyager_feed_entries').select('id,body,parent_id').eq('id', id).eq('creator_id', viewer.id).maybeSingle()
  if (error) throw new Error('The result could not be checked. Please try again.')
  return data
}

type Result = { error: string | null; id?: string; outcome?: 'rejected' | 'unknown' }
export async function createVoyagerPost(form: FormData): Promise<Result> {
  let attemptedWrite = false
  try {
    const { db, viewer } = await feedSession()
    if (!canReadVoyagerFeed(viewer) || !viewer) return { outcome: 'rejected', error: 'Register or log in to participate.' }
    const parentId = form.get('parentId') || null
    const id = form.get('id')
    if (!validFeedId(id) || (parentId !== null && !validFeedId(parentId))) return { outcome: 'rejected', error: 'Invalid post request.' }
    // Stable client request IDs make a retry after an unknown network result safe.
    const existing = await db.from('voyager_feed_entries').select('id,creator_id').eq('id', id).maybeSingle()
    if (existing.error) return { outcome: 'unknown', error: 'The feed is unavailable. Please retry.' }
    if (existing.data) return existing.data.creator_id === viewer.id ? { error: null, id } : { error: 'Invalid post request.' }
    if (!parentId && !canPublishVoyagerFeed(viewer)) return { outcome: 'rejected', error: 'Become a Voyager to publish posts.' }
    const selected = form.get('authorId')
    let authorId = viewer.id
    if (selected && selected !== viewer.id) {
      if (parentId || !canPublishAsNpc(viewer) || !validFeedId(selected)) return { outcome: 'rejected', error: 'Only Architects can publish posts using an NPC identity.' }
      authorId = (await resolvePublishingIdentity(selected, { id: viewer.id, name: viewer.display_name, role: viewer.role })).id
    }
    const body = validateFeedBody(form.get('body'))
    if (parentId) {
      const parent = await db.from('voyager_feed_entries').select('id').eq('id', parentId).is('parent_id', null).maybeSingle()
      if (parent.error || !parent.data) return { outcome: 'rejected', error: 'This post is no longer available.' }
    }
    let imagePath: string | null = null
    const image = form.get('image')
    if (image instanceof File && image.size) {
      if (parentId || !canPublishVoyagerFeed(viewer)) return { outcome: 'rejected', error: 'Images can only be attached to posts.' }
      if (image.size > 5 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(image.type)) return { outcome: 'rejected', error: 'Choose a JPG, PNG or WebP image up to 5 MB.' }
      const bytes = new Uint8Array(await image.arrayBuffer())
      const validation = validateAvatar(bytes, image.type)
      if (validation.error) return { outcome: 'rejected', error: validation.error }
      imagePath = `${viewer.id}/${id}.${validation.extension}`
      attemptedWrite = true
      const uploaded = await db.storage.from('voyager-feed').upload(imagePath, bytes, { contentType: image.type, upsert: false })
      // An existing object belongs to the same stable request ID. It is immutable.
      if (uploaded.error && !['409','Duplicate'].includes(String(uploaded.error.statusCode))) return { outcome: 'unknown', error: 'Image upload could not be confirmed. Retry this post.' }
    }
    attemptedWrite = true
    const result = await db.from('voyager_feed_entries').insert({ id, author_id: authorId, creator_id: viewer.id, parent_id: parentId, body, image_path: imagePath }).select('id').single()
    if (result.error) return { outcome: ['42501','23514','P0001'].includes(result.error.code) ? 'rejected' : 'unknown', error: 'Publishing could not be confirmed. Retry this post; duplicate posts will not be created.' }
    revalidatePath('/voyagers')
    return { outcome: 'rejected', error: null, id }
  } catch (error) { return { outcome: attemptedWrite ? 'unknown' : 'rejected', error: error instanceof Error ? error.message : 'Publishing could not be confirmed. Retry this post.' } }
}

export async function editVoyagerPost(id: string, text: string): Promise<Result> {
  try {
    const { db, viewer } = await feedSession()
    if (!validFeedId(id) || !canReadVoyagerFeed(viewer) || !viewer) return { error: 'Your access could not be verified.' }
    const body = validateFeedBody(text)
    const { data, error } = await db.from('voyager_feed_entries').update({ body }).eq('id', id).eq('creator_id', viewer.id).select('id').maybeSingle()
    if (error || !data) return { error: 'Only the author can edit this content. It may have been deleted.' }
    revalidatePath('/voyagers')
    return { error: null }
  } catch { return { error: 'Changes could not be confirmed. Reload before trying again.' } }
}
export async function deleteVoyagerPost(id: string): Promise<Result> {
  try {
    const { db, viewer } = await feedSession()
    if (!validFeedId(id) || !canReadVoyagerFeed(viewer) || !viewer) return { error: 'Your access could not be verified.' }
    const { data, error } = await db.from('voyager_feed_entries').delete().eq('id', id).eq('creator_id', viewer.id).select('id,image_path').maybeSingle()
    if (error || !data) return { error: 'This content could not be deleted. Reload to confirm its current state.' }
    // Privileged cleanup only after an owner-scoped, RLS-protected deletion succeeds.
    // A failed cleanup never makes a deleted image readable through the media route.
    if (data.image_path) {
      try {
        const cleanup = await createAdminClient().storage.from('voyager-feed').remove([data.image_path])
        if (cleanup.error) console.error('Voyager feed media cleanup required', { postId: id })
      } catch { console.error('Voyager feed media cleanup required', { postId: id }) }
    }
    revalidatePath('/voyagers')
    return { error: null }
  } catch { return { error: 'Deletion could not be confirmed. Reload before trying again.' } }
}
export async function setVoyagerLike(id: string, liked: boolean): Promise<Result> {
  try {
    const { db, viewer } = await feedSession()
    if (!validFeedId(id) || typeof liked !== 'boolean' || !canReadVoyagerFeed(viewer) || !viewer) return { error: 'Register or log in to participate.' }
    const result = liked
      ? await db.from('voyager_feed_likes').insert({ entry_id: id, user_id: viewer.id })
      : await db.from('voyager_feed_likes').delete().eq('entry_id', id).eq('user_id', viewer.id)
    if (result.error && !(liked && result.error.code === '23505')) return { error: 'Your reaction could not be saved. Please retry.' }
    return { error: null }
  } catch { return { error: 'Your reaction could not be confirmed. Please retry.' } }
}
