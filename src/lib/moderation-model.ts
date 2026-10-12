export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'harassment', label: 'Harassment or hate' },
  { value: 'inappropriate', label: 'Inappropriate or unsafe content' },
  { value: 'other', label: 'Something else' },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]['value']
export const REPORT_DETAILS_MAX = 500

export function isReportReason(value: unknown): value is ReportReason {
  return REPORT_REASONS.some((reason) => reason.value === value)
}

/** Returns an error message, or null when the report is acceptable. */
export function validateReport(reason: unknown, details: unknown): string | null {
  if (!isReportReason(reason)) return 'Choose a reason for the report.'
  if (details != null && typeof details !== 'string') return 'Details must be text.'
  if (typeof details === 'string' && details.trim().length > REPORT_DETAILS_MAX) {
    return `Keep details within ${REPORT_DETAILS_MAX} characters.`
  }
  return null
}

export type HiddenContent = {
  authorIds: ReadonlySet<string>
  commentIds: ReadonlySet<string>
  worldReportIds: ReadonlySet<string>
}

export const NOTHING_HIDDEN: HiddenContent = { authorIds: new Set(), commentIds: new Set(), worldReportIds: new Set() }

/** Drops world reports whose author the viewer blocked or that the viewer reported. */
export function dropHiddenWorldReports<T extends { id: string; author_id: string }>(
  reports: readonly T[],
  hidden: HiddenContent,
): T[] {
  return reports.filter((r) => !hidden.worldReportIds.has(r.id) && !hidden.authorIds.has(r.author_id))
}

/** Drops comments the viewer blocked or reported, plus replies under a dropped parent. */
export function dropHiddenComments<T extends { id: string; author_id: string | null; parent_id?: string | null }>(
  comments: readonly T[],
  hidden: HiddenContent,
): T[] {
  if (!hidden.authorIds.size && !hidden.commentIds.size) return [...comments]
  const dropped = new Set<string>()
  for (const c of comments) {
    if (hidden.commentIds.has(c.id) || (c.author_id && hidden.authorIds.has(c.author_id))) dropped.add(c.id)
  }
  // Replies hang off their parent; a hidden parent takes its visible-only subtree with it.
  let grew = true
  while (grew) {
    grew = false
    for (const c of comments) {
      if (!dropped.has(c.id) && c.parent_id && dropped.has(c.parent_id)) { dropped.add(c.id); grew = true }
    }
  }
  return comments.filter((c) => !dropped.has(c.id))
}
