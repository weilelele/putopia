import type { InitiationOrderKind } from './initiation-types'

/** Pure templates only. No mail is sent by this module. Legacy templates remain separate. */
export function initiationConfirmationEmail(siteUrl: string, kind: InitiationOrderKind = 'standard') {
  if (kind === 'initial' || kind === 'initial_upgrade') return {
    subject: kind === 'initial' ? 'S26 Initial Voyager Pack confirmed' : 'S26 Console upgrade confirmed',
    text: kind === 'initial'
      ? `Your US$48 Initial Voyager Pack payment is confirmed. Your membership and first two Packs are included. Console and the fourth Pack are not included. View your records: ${new URL('/voyager-initiation', siteUrl).href}`
      : `Your US$500 Console upgrade payment is confirmed. Your existing membership and first two Packs remain; the upgrade adds one Console claim and the fourth Pack. View your records: ${new URL('/voyager-initiation', siteUrl).href}`,
  }
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
