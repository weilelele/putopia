/** Retired by product decision: no legacy generation, imports or recall. */
export const LEGACY_DISPATCH_ENABLED = false

/**
 * Paused while the Worlds loop is redesigned. Rounds stop advancing, Cosmo is not
 * called and no round email is sent. Submissions and votes inside an already open
 * window stay available; the crons keep running as no-ops so resuming is this flag.
 */
export const DREAMCATCHER_ROUNDS_ENABLED = false
