/** Notifications only; the server remains authoritative for payment, cooldown and completion. */
export const CALIBRATION_CHECK_EVENT = 'mc:calibration-check'
export const CALIBRATION_COMPLETED_KEY = 'mc:calibration-completed'
export const CALIBRATION_COMPLETED_EVENT = 'mc:calibration-completed'

export function notifyCalibrationCompleted(userId: string) {
  try { localStorage.setItem(CALIBRATION_COMPLETED_KEY, JSON.stringify({ userId, at: Date.now() })) } catch { /* Entry checks still read server completion. */ }
  window.dispatchEvent(new Event(CALIBRATION_COMPLETED_EVENT))
}
