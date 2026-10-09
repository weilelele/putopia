import type { InitiationOrderKind } from './initiation-types'

/** Pure templates only. No mail is sent by this module. Legacy templates remain separate. */
export function initiationConfirmationEmail(siteUrl: string, kind: InitiationOrderKind = 'standard') {
  return { subject: 'S26 Voyager Initiation confirmed', text: `Your US$${kind === 'legacy_upgrade' ? '400 upgrade' : '520'} one-time Voyager Initiation payment is confirmed. Your membership is long-term. ${kind === 'legacy_upgrade' ? 'Your existing first two Packs are retained without duplication; your upgrade adds the Console and fourth Pack. ' : ''}Your four Packs are scheduled for October, November and December 2026, and January 2027. View your actual fulfillment and Console claim status: ${new URL('/voyager-initiation', siteUrl).href}` }
}
export function initiationShipmentEmail(pack: 1 | 2 | 3 | 4, siteUrl: string) {
  return { subject: `S26 Initiation Pack ${pack} dispatched`, text: `Your Initiation Pack ${pack} has been dispatched. View your tracking information: ${new URL('/voyager-initiation', siteUrl).href}` }
}
export function initiationCalibrationEmail(siteUrl: string) {
  return { subject: 'Continue your Voyager Calibration', text: `Complete Calibration, then return to Initiation to check payment availability. Calibration alone does not activate paid membership: ${new URL('/voyager-initiation', siteUrl).href}` }
}
export function initiationConsoleEmail(siteUrl: string) {
  return { subject: 'Your Initiation Console allocation', text: `View your allocated Console and fulfillment progress: ${new URL('/devices/my-consoles', siteUrl).href}. Your four Initiation Pack records remain in Initiation.` }
}
