import 'server-only'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NOTHING_HIDDEN, dropHiddenComments, dropHiddenWorldReports, type HiddenContent } from '@/lib/moderation-model'

/** Members and comments the signed-in viewer has blocked or reported. Guests see everything. */
export async function getViewerHiddenContent(): Promise<HiddenContent> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NOTHING_HIDDEN

  const admin = createAdminClient()
  const [blocks, reports] = await Promise.all([
    (admin.from('user_blocks' as never) as ReturnType<typeof admin.from>)
      .select('blocked_id').eq('blocker_id', user.id),
    (admin.from('content_reports' as never) as ReturnType<typeof admin.from>)
      .select('comment_id, world_report_id').eq('reporter_id', user.id),
  ])
  // A failed lookup must not break reading: fall back to showing the content.
  if (blocks.error || reports.error) return NOTHING_HIDDEN
  const reportRows = reports.data as { comment_id: string | null; world_report_id: string | null }[]
  return {
    authorIds: new Set((blocks.data as { blocked_id: string }[]).map((row) => row.blocked_id)),
    commentIds: new Set(reportRows.flatMap((row) => (row.comment_id ? [row.comment_id] : []))),
    worldReportIds: new Set(reportRows.flatMap((row) => (row.world_report_id ? [row.world_report_id] : []))),
  }
}

/** Filters a list of comment rows for the current viewer. */
export async function withoutHiddenComments<T extends { id: string; author_id: string | null; parent_id?: string | null }>(
  comments: readonly T[],
): Promise<T[]> {
  return dropHiddenComments(comments, await getViewerHiddenContent())
}

export async function withoutHiddenWorldReports<T extends { id: string; author_id: string }>(
  reports: readonly T[],
): Promise<T[]> {
  return dropHiddenWorldReports(reports, await getViewerHiddenContent())
}
