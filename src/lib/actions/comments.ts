'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Comment, CommentSubjectType } from '@/types/database'

// Path to revalidate when a thread changes (only device threads have a route today)
function subjectPath(type: CommentSubjectType, id: string): string | null {
  if (type === 'device') return `/devices/${id}`
  if (type === 'intel')  return `/intel/${id}`
  if (type === 'world')  return `/worlds/${id}`
  return null
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getComments(
  subjectType: CommentSubjectType,
  subjectId: string,
): Promise<Comment[]> {
  const admin = createAdminClient()
  const { data } = await (admin.from('comments' as never) as ReturnType<typeof admin.from>)
    .select('*')
    .eq('subject_type', subjectType)
    .eq('subject_id', subjectId)
    .eq('is_visible', true)
    .order('created_at', { ascending: true })
    .limit(200)

  const comments = (data ?? []) as Comment[]
  if (comments.length === 0) return comments

  // Enrich with each author's CURRENT profile so avatars/names stay live, and
  // gate the avatar by role: applicants render initials; voyagers/architects
  // show their custom avatar. Deleted profiles keep the denormalized snapshot.
  const authorIds = [...new Set(comments.map((c) => c.author_id).filter(Boolean))] as string[]
  if (authorIds.length === 0) return comments

  const { data: profiles } = await admin
    .from('voyager_profiles')
    .select('id, display_name, avatar_url, role')
    .in('id', authorIds)

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]))
  return comments.map((c) => {
    const p = c.author_id ? byId.get(c.author_id) : null
    if (!p) return c
    const showAvatar = p.role === 'voyager' || p.role === 'architect'
    return {
      ...c,
      author_name:       p.display_name ?? c.author_name,
      author_avatar_url: showAvatar ? (p.avatar_url ?? null) : null,
    }
  })
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function postComment(
  subjectType: CommentSubjectType,
  subjectId: string,
  body: string,
): Promise<{ error: string | null; data: Comment | null }> {
  const text = body.trim()
  if (!text) return { error: 'Empty comment', data: null }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: null }

  // Denormalize the author so the thread survives later profile edits/deletes
  const { data: profile } = await supabase
    .from('voyager_profiles')
    .select('display_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  // Only voyagers/architects show a custom avatar; applicants render initials.
  const showAvatar = profile?.role === 'voyager' || profile?.role === 'architect'

  const admin = createAdminClient()
  const { data, error } = await (admin.from('comments' as never) as ReturnType<typeof admin.from>)
    .insert({
      subject_type:      subjectType,
      subject_id:        subjectId,
      author_id:         user.id,
      author_name:       profile?.display_name ?? 'Voyager',
      author_avatar_url: showAvatar ? (profile?.avatar_url ?? null) : null,
      body:              text.slice(0, 2000),
    })
    .select()
    .single()

  if (error) return { error: error.message, data: null }

  const path = subjectPath(subjectType, subjectId)
  if (path) revalidatePath(path)
  return { error: null, data: data as Comment }
}

// ─── Moderation: author or architect may remove ───────────────────────────────

export async function deleteComment(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const admin = createAdminClient()
  const { data: row } = await (admin.from('comments' as never) as ReturnType<typeof admin.from>)
    .select('author_id, subject_type, subject_id')
    .eq('id', id)
    .single()

  const comment = row as { author_id: string | null; subject_type: CommentSubjectType; subject_id: string } | null
  if (!comment) return { error: 'Not found' }
  if (comment.author_id !== user.id && me?.role !== 'architect') return { error: 'Forbidden' }

  const { error } = await (admin.from('comments' as never) as ReturnType<typeof admin.from>)
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  const path = subjectPath(comment.subject_type, comment.subject_id)
  if (path) revalidatePath(path)
  return { error: null }
}
