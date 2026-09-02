/**
 * Legacy Scan is unavailable during the product redesign. Keep its success and
 * failure notifications off in every environment, including direct publish-time
 * sends. This deliberately does not depend on deployment environment variables.
 *
 * Re-enabling requires a product review and a policy for old, unresolved scans;
 * simply flipping this flag could send stale notifications from the backlog.
 */
export const SCAN_NOTIFICATIONS_ENABLED = false
