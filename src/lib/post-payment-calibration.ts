import type { InitiationSnapshot } from './initiation-types'

export type CalibrationSnapshot = Pick<InitiationSnapshot, 'userId' | 'status' | 'paymentStatus' | 'purchaseKind' | 'error' | 'calibrated' | 'role'>
export type CalibrationReminderResult =
  | { status: 'due'; promptedAt: string; snapshot: CalibrationSnapshot }
  | { status: 'completed' | 'cooldown' | 'ineligible' | 'deferred' | 'unavailable' }

/** A checkout redirect or a role alone is never evidence of a confirmed payment. */
export function hasConfirmedInitiationPayment(snapshot: Pick<InitiationSnapshot, 'userId' | 'status' | 'paymentStatus' | 'purchaseKind' | 'error'>): boolean {
  return !!snapshot.userId && !snapshot.error && snapshot.paymentStatus === 'paid'
    && (snapshot.status === 'initiated' || (snapshot.status === 'legacy_pack' && snapshot.purchaseKind === 'initial'))
}

export function shouldInviteCalibration(snapshot: CalibrationSnapshot): boolean {
  return hasConfirmedInitiationPayment(snapshot) && !snapshot.calibrated
}

/** Avoid interrupting account setup, an existing quiz, authoring or fixture pages. */
export function allowsCalibrationReminder(pathname: string): boolean {
  return !['/login', '/register', '/auth', '/new', '/quiz', '/admin', '/studio', '/dev', '/offline'].some(path => pathname === path || pathname.startsWith(`${path}/`))
}

/** Validate the private RPC boundary; malformed/unavailable records never invite. */
export function parseCalibrationReminder(raw: unknown): CalibrationReminderResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { status: 'unavailable' }
  const value = raw as Record<string, unknown>
  if (['completed', 'cooldown', 'ineligible', 'deferred'].includes(String(value.status))) return { status: value.status as 'completed' | 'cooldown' | 'ineligible' | 'deferred' }
  if (value.status !== 'due' || typeof value.promptedAt !== 'string' || !Number.isFinite(Date.parse(value.promptedAt)) || !value.snapshot || typeof value.snapshot !== 'object') return { status: 'unavailable' }
  const snapshot = value.snapshot as CalibrationSnapshot
  if (typeof snapshot.userId !== 'string' || !snapshot.userId || !['initial', 'standard', 'legacy_upgrade'].includes(snapshot.purchaseKind ?? '')
    || typeof snapshot.role !== 'string' || snapshot.calibrated !== false || snapshot.error !== null || !shouldInviteCalibration(snapshot)) return { status: 'unavailable' }
  return { status: 'due', promptedAt: value.promptedAt, snapshot }
}
