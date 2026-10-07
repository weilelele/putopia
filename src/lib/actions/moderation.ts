'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { DEVICE_SUPPORT_EMAIL } from '@/lib/device-purchase-terms'
import { validateReport, type ReportReason } from '@/lib/moderation-model'

type Result = { error: string | null }

async function requireMember() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function requireArchitect() {
  const user = await requireMember()
  if (!user) return null
  const supabase = await createClient()
  const { data: profile } = await supabase.from('voyager_profiles').select('role').eq('id', user.id).maybeSingle()
  return profile?.role === 'architect' ? user : null
}

export type ReportTarget = { kind: 'comment' | 'world_report'; id: string }

type CommentRow = { id: string; author_id: string | null; author_name: string; body: string; subject_type: string; subject_id: string }

async function readComment(commentId: string): Promise<CommentRow | null> {
  const admin = createAdminClient()
  const { data } = await (admin.from('comments' as never) as ReturnType<typeof admin.from>)
    .select('id, author_id, author_name, body, subject_type, subject_id').eq('id', commentId).maybeSingle()
  return (data as CommentRow | null) ?? null
}

type TargetInfo = { authorId: string | null; authorName: string; body: string; where: string }

async function readTarget(target: ReportTarget): Promise<TargetInfo | null> {
  if (target.kind === 'comment') {
    const c = await readComment(target.id)
    return c && { authorId: c.author_id, authorName: c.author_name, body: c.body, where: `${c.subject_type} discussion` }
  }
  const admin = createAdminClient()
  const { data } = await (admin.from('world_reports' as never) as ReturnType<typeof admin.from>)
    .select('author_id, body, world_id').eq('id', target.id).maybeSingle()
  const r = data as { author_id: string; body: string; world_id: string } | null
  if (!r) return null
  const { data: profile } = await admin.from('voyager_profiles').select('display_name').eq('id', r.author_id).maybeSingle()
  return { authorId: r.author_id, authorName: profile?.display_name ?? 'Member', body: r.body, where: `world ${r.world_id} report` }
}

// ─── Member actions ───────────────────────────────────────────────────────────

export async function reportContent(target: ReportTarget, reason: ReportReason, details?: string): Promise<Result> {
  const user = await requireMember()
  if (!user) return { error: 'Sign in to report content.' }
  const invalid = validateReport(reason, details)
  if (invalid) return { error: invalid }

  const content = await readTarget(target)
  if (!content) return { error: 'This content is no longer available.' }
  if (content.authorId === user.id) return { error: 'You cannot report your own content.' }

  const admin = createAdminClient()
  const { error } = await (admin.from('content_reports' as never) as ReturnType<typeof admin.from>)
    .insert({ reporter_id: user.id, ...(target.kind === 'comment' ? { comment_id: target.id } : { world_report_id: target.id }), reason, details: details?.trim() || null } as never)
  // Reporting twice is a no-op, not an error: the reporter already hid it.
  if (error && error.code !== '23505') return { error: 'Could not send the report. Please try again.' }

  if (!error) {
    // Moderators are told straight away; failures only log (the report is saved).
    const text = `A member reported content in the ${content.where} by ${content.authorName}.\n\nReason: ${reason}\nDetails: ${details?.trim() || '—'}\n\n"${content.body.slice(0, 500)}"\n\nReview it at /admin/reports. Reports are handled within 24 hours.`
    const html = `<pre style="font-family:monospace;white-space:pre-wrap">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`
    await sendEmail({ to: DEVICE_SUPPORT_EMAIL, subject: `Content report: ${reason}`, html, text })
  }
  return { error: null }
}

/** Blocks the author of a post (so the UI never needs the author's id). */
export async function blockAuthor(target: ReportTarget): Promise<Result> {
  const user = await requireMember()
  if (!user) return { error: 'Sign in to block members.' }
  const content = await readTarget(target)
  if (!content?.authorId) return { error: 'This member cannot be blocked.' }
  if (content.authorId === user.id) return { error: 'You cannot block yourself.' }

  const admin = createAdminClient()
  const { error } = await (admin.from('user_blocks' as never) as ReturnType<typeof admin.from>)
    .upsert({ blocker_id: user.id, blocked_id: content.authorId } as never, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true })
  return { error: error ? 'Could not block this member. Please try again.' : null }
}

export type BlockedMember = { id: string; name: string }

export async function listBlockedMembers(): Promise<BlockedMember[]> {
  const user = await requireMember()
  if (!user) return []
  const admin = createAdminClient()
  const { data: blocks } = await (admin.from('user_blocks' as never) as ReturnType<typeof admin.from>)
    .select('blocked_id, created_at').eq('blocker_id', user.id).order('created_at', { ascending: false })
  const ids = ((blocks ?? []) as { blocked_id: string }[]).map((row) => row.blocked_id)
  if (!ids.length) return []
  const { data: profiles } = await admin.from('voyager_profiles').select('id, display_name').in('id', ids)
  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]))
  return ids.map((id) => ({ id, name: names.get(id) ?? 'Member' }))
}

export async function unblockMember(blockedId: string): Promise<Result> {
  const user = await requireMember()
  if (!user) return { error: 'Sign in first.' }
  const admin = createAdminClient()
  const { error } = await (admin.from('user_blocks' as never) as ReturnType<typeof admin.from>)
    .delete().eq('blocker_id', user.id).eq('blocked_id', blockedId)
  return { error: error ? 'Could not unblock this member.' : null }
}

// ─── Moderator actions ────────────────────────────────────────────────────────

export type OpenReport = {
  id: string
  created_at: string
  reason: ReportReason
  details: string | null
  reporter_name: string
  target: ReportTarget
  author_name: string
  body: string
  where: string
}

type ReportRow = {
  id: string; created_at: string; reason: ReportReason; details: string | null
  reporter_id: string; comment_id: string | null; world_report_id: string | null
}

function targetOf(row: Pick<ReportRow, 'comment_id' | 'world_report_id'>): ReportTarget | null {
  if (row.comment_id) return { kind: 'comment', id: row.comment_id }
  if (row.world_report_id) return { kind: 'world_report', id: row.world_report_id }
  return null
}

export async function listOpenReports(): Promise<OpenReport[]> {
  if (!await requireArchitect()) return []
  const admin = createAdminClient()
  const { data } = await (admin.from('content_reports' as never) as ReturnType<typeof admin.from>)
    .select('id, created_at, reason, details, reporter_id, comment_id, world_report_id')
    .eq('status', 'open').order('created_at', { ascending: true }).limit(200)
  const rows = (data ?? []) as ReportRow[]
  if (!rows.length) return []

  const { data: reporters } = await admin.from('voyager_profiles').select('id, display_name')
    .in('id', [...new Set(rows.map((r) => r.reporter_id))])
  const reporterById = new Map((reporters ?? []).map((p) => [p.id, p.display_name]))

  const out: OpenReport[] = []
  for (const row of rows) {
    const target = targetOf(row)
    const content = target && await readTarget(target)
    if (!target || !content) continue
    out.push({
      id: row.id, created_at: row.created_at, reason: row.reason, details: row.details,
      reporter_name: reporterById.get(row.reporter_id) ?? 'Member', target,
      author_name: content.authorName, body: content.body, where: content.where,
    })
  }
  return out
}

/** "removed" takes the content down for everyone; "dismissed" keeps it and closes the report. */
export async function resolveReport(reportId: string, outcome: 'removed' | 'dismissed'): Promise<Result> {
  const moderator = await requireArchitect()
  if (!moderator) return { error: 'Forbidden' }
  const admin = createAdminClient()
  const reports = admin.from('content_reports' as never) as ReturnType<typeof admin.from>
  const { data } = await reports.select('comment_id, world_report_id').eq('id', reportId).maybeSingle()
  const target = data ? targetOf(data as ReportRow) : null
  if (!target) return { error: 'Report not found.' }

  const resolution = { resolved_by: moderator.id, resolved_at: new Date().toISOString() }
  if (outcome === 'dismissed') {
    const { error } = await reports.update({ status: 'dismissed', ...resolution } as never).eq('id', reportId)
    if (error) return { error: error.message }
  } else if (target.kind === 'comment') {
    // Deleting a comment also removes its replies and every report filed against it.
    const { error } = await (admin.from('comments' as never) as ReturnType<typeof admin.from>).delete().eq('id', target.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await (admin.from('world_reports' as never) as ReturnType<typeof admin.from>)
      .update({ is_visible: false } as never).eq('id', target.id)
    if (error) return { error: error.message }
    await reports.update({ status: 'removed', ...resolution } as never).eq('world_report_id', target.id).eq('status', 'open')
  }
  revalidatePath('/admin/reports')
  return { error: null }
}
