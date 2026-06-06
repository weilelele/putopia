'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import type { Comment, CommentSubjectType, ImpersonatableProfile } from '@/types/database'

// Path to revalidate when a thread changes (only device threads have a route today)
function subjectPath(type: CommentSubjectType, id: string): string | null {
  if (type === 'device') return `/devices/${id}`
  if (type === 'intel')  return `/intel/${id}`
  if (type === 'world')  return `/worlds/${id}`
  return null
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://multiverseco.org'

const SUBJECT_LABEL: Record<CommentSubjectType, string> = {
  device: 'device',
  intel:  'intel report',
  world:  'world',
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getComments(
  subjectType: CommentSubjectType,
  subjectId: string,
): Promise<Comment[]> {
  const admin = createAdminClient()
  const { data } = await (admin.from('comments' as never) as ReturnType<typeof admin.from>)
    .select('id, created_at, subject_type, subject_id, author_id, author_name, author_avatar_url, body, is_visible, parent_id')
    .eq('subject_type', subjectType)
    .eq('subject_id', subjectId)
    .eq('is_visible', true)
    .order('created_at', { ascending: true })
    .limit(400)

  const comments = (data ?? []) as Comment[]
  if (comments.length === 0) return comments

  // Enrich with each author's CURRENT profile so avatars/names stay live, and
  // gate the avatar by role: applicants render initials; voyagers/architects
  // show their custom avatar. Deleted profiles keep the denormalized snapshot.
  // NOTE: for impersonated comments author_id is the impersonated member, so the
  // public thread naturally renders that member's live profile — the real
  // architect (posted_by_id) is never selected into this payload.
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

// Profiles an architect may post AS. Voyagers + architects only (formal members).
export async function listImpersonatableProfiles(): Promise<ImpersonatableProfile[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: me } = await supabase
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (me?.role !== 'architect') return []

  const admin = createAdminClient()
  const { data } = await admin
    .from('voyager_profiles')
    .select('id, display_name, avatar_url, role')
    .in('role', ['voyager', 'architect'])
    .order('display_name', { ascending: true })

  return (data ?? []) as ImpersonatableProfile[]
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function postComment(
  subjectType: CommentSubjectType,
  subjectId: string,
  body: string,
  opts?: { parentId?: string | null; asProfileId?: string | null; subjectTitle?: string },
): Promise<{ error: string | null; data: Comment | null }> {
  const text = body.trim()
  if (!text) return { error: 'Empty comment', data: null }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: null }

  // The caller's own profile (also gates whether impersonation is allowed).
  const { data: caller } = await supabase
    .from('voyager_profiles')
    .select('display_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  // Resolve the effective author. By default it's the caller. An architect may
  // post AS another voyager/architect — in that case author_* point at the
  // impersonated member and posted_by_id records the real architect for audit.
  let authorId = user.id
  let authorName = caller?.display_name ?? 'Voyager'
  let authorAvatar = (caller?.role === 'voyager' || caller?.role === 'architect') ? (caller?.avatar_url ?? null) : null
  let postedById: string | null = null

  const admin = createAdminClient()

  if (opts?.asProfileId && opts.asProfileId !== user.id) {
    if (caller?.role !== 'architect') {
      return { error: 'Only architects may post as another identity', data: null }
    }
    const { data: target } = await admin
      .from('voyager_profiles')
      .select('id, display_name, avatar_url, role')
      .eq('id', opts.asProfileId)
      .single()
    if (!target || (target.role !== 'voyager' && target.role !== 'architect')) {
      return { error: 'Invalid identity', data: null }
    }
    authorId = target.id
    authorName = target.display_name
    authorAvatar = target.avatar_url ?? null
    postedById = user.id
  }

  // Validate parent (if replying): must belong to the same thread.
  let parentId: string | null = null
  if (opts?.parentId) {
    const { data: parent } = await (admin.from('comments' as never) as ReturnType<typeof admin.from>)
      .select('id, subject_type, subject_id')
      .eq('id', opts.parentId)
      .single()
    const p = parent as { id: string; subject_type: CommentSubjectType; subject_id: string } | null
    if (!p || p.subject_type !== subjectType || p.subject_id !== subjectId) {
      return { error: 'Invalid reply target', data: null }
    }
    parentId = p.id
  }

  const { data, error } = await (admin.from('comments' as never) as ReturnType<typeof admin.from>)
    .insert({
      subject_type:      subjectType,
      subject_id:        subjectId,
      author_id:         authorId,
      author_name:       authorName,
      author_avatar_url: authorAvatar,
      body:              text.slice(0, 2000),
      parent_id:         parentId,
      posted_by_id:      postedById,
    })
    .select('id, created_at, subject_type, subject_id, author_id, author_name, author_avatar_url, body, is_visible, parent_id')
    .single()

  if (error) return { error: error.message, data: null }

  // Notify the parent author by email — only when a real architect hits send
  // (regardless of which identity they're posting as via impersonation).
  // Regular members (applicant / voyager) replying does NOT trigger an email.
  if (parentId && caller?.role === 'architect') {
    await notifyReply({ parentId, replierName: authorName, replyBody: text, effectiveAuthorId: authorId, subjectType, subjectId, subjectTitle: opts?.subjectTitle })
  }

  const path = subjectPath(subjectType, subjectId)
  if (path) revalidatePath(path)
  return { error: null, data: data as Comment }
}

// ─── Reply notification email ─────────────────────────────────────────────────

async function notifyReply(args: {
  parentId: string
  replierName: string
  replyBody: string
  effectiveAuthorId: string
  subjectType: CommentSubjectType
  subjectId: string
  subjectTitle?: string
}) {
  try {
    const admin = createAdminClient()
    const { data: parent } = await (admin.from('comments' as never) as ReturnType<typeof admin.from>)
      .select('author_id')
      .eq('id', args.parentId)
      .single()
    const parentAuthorId = (parent as { author_id: string | null } | null)?.author_id
    if (!parentAuthorId) return
    // Don't email someone for replying to their own comment.
    if (parentAuthorId === args.effectiveAuthorId) return

    // `email` exists in the DB (schema.sql) but isn't in the generated types,
    // so query through an untyped client and shape the result ourselves.
    const { data: recipientRaw } = await (admin.from('voyager_profiles' as never) as ReturnType<typeof admin.from>)
      .select('email, display_name')
      .eq('id', parentAuthorId)
      .single()
    const recipient = recipientRaw as { email: string | null; display_name: string | null } | null
    const to = recipient?.email
    if (!to) return

    const path = subjectPath(args.subjectType, args.subjectId) ?? '/'
    const link = `${SITE_URL}${path}`
    const where = args.subjectTitle
      ? `${args.subjectTitle} (${SUBJECT_LABEL[args.subjectType]})`
      : `a ${SUBJECT_LABEL[args.subjectType]}`
    const snippet = args.replyBody.length > 280 ? `${args.replyBody.slice(0, 280)}…` : args.replyBody
    const greetName = recipient?.display_name ?? 'Voyager'

    const html = `
      <div style="font-family:'Courier New',monospace;background:#0A0E27;color:#F5F5F5;padding:32px;">
        <p style="letter-spacing:0.2em;color:#FF6B35;font-size:12px;margin:0 0 16px;">MULTIVERSE COLLECTIVE — TRANSMISSION</p>
        <p style="margin:0 0 12px;">${escapeHtml(greetName)},</p>
        <p style="margin:0 0 12px;color:#cfd2e0;">${escapeHtml(args.replierName)} replied to your transmission on ${escapeHtml(where)}:</p>
        <blockquote style="border-left:2px solid #E85D04;margin:0 0 20px;padding:8px 16px;color:#cfd2e0;white-space:pre-wrap;">${escapeHtml(snippet)}</blockquote>
        <a href="${link}" style="display:inline-block;background:#FF6B35;color:#0A0E27;text-decoration:none;padding:10px 20px;font-weight:700;letter-spacing:0.1em;font-size:13px;">VIEW THE THREAD</a>
        <p style="margin:24px 0 0;color:#6b7088;font-size:11px;">— BUILDING BETTER WORLDS, TOGETHER.</p>
      </div>`
    const plain = `${greetName},\n\n${args.replierName} replied to your transmission on ${where}:\n\n"${snippet}"\n\nView the thread: ${link}\n\n— Multiverse Collective`

    await sendEmail({ to, subject: `${args.replierName} replied to your transmission`, html, text: plain })
  } catch (e) {
    console.error('[comments] notifyReply failed', e)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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

  // Cascade is handled by the FK (parent_id ... on delete cascade): removing a
  // parent also removes its replies.
  const { error } = await (admin.from('comments' as never) as ReturnType<typeof admin.from>)
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  const path = subjectPath(comment.subject_type, comment.subject_id)
  if (path) revalidatePath(path)
  return { error: null }
}
