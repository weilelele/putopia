export const DELETE_CONFIRMATION = 'DELETE'
export const DELETED_MEMBER_NAME = 'Deleted member'
export const DELETED_COMMENT_BODY = '[This member deleted their account]'

export function isDeletionConfirmed(value: unknown): boolean {
  return typeof value === 'string' && value.trim().toUpperCase() === DELETE_CONFIRMATION
}

/** Unusable address for an account that has to stay as a shell (see deleteMyAccount). */
export function tombstoneEmail(userId: string): string {
  return `deleted-${userId}@deleted.invalid`
}

/**
 * Splits a member's comments into those that can be removed outright and those
 * that other members replied to, which are blanked so the thread stays readable.
 */
export function planCommentCleanup(
  ownIds: readonly string[],
  parentIdsOfAnyComment: readonly (string | null)[],
): { remove: string[]; blank: string[] } {
  const hasReplies = new Set(parentIdsOfAnyComment.filter((id): id is string => !!id))
  return {
    remove: ownIds.filter((id) => !hasReplies.has(id)),
    blank: ownIds.filter((id) => hasReplies.has(id)),
  }
}
