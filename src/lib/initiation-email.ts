import { INITIATION_PRICES, INITIATION_PRICING_VERSION } from './initiation-pricing'
import type { InitiationOrderKind } from './initiation-types'

/** Pure templates only. No mail is sent by this module. Legacy templates remain separate. */
export function initiationConfirmationEmail(siteUrl: string, kind: InitiationOrderKind = 'standard', receipt?: { amount: number; pricing_version?: string | null }) {
  const amount = receipt?.amount ?? INITIATION_PRICES[kind].amount
  const historical = receipt && receipt.pricing_version !== INITIATION_PRICING_VERSION
  const contents = kind === 'initial' ? 'Your payment includes member access and Packs 1–2. Console + Pack 4 can be added later for $460.' : kind === 'legacy_upgrade' ? 'Your existing first two Packs are retained without duplication; this payment adds the Console and Pack 4.' : 'Your payment includes member access and all four Packs, including the Console.'
  return { subject: 'S26 Voyager Pack confirmed', text: `Your US$${amount / 100} one-time ${INITIATION_PRICES[kind].name} payment is confirmed. ${contents} ${historical ? 'Your original purchase terms remain applicable. ' : ''}View actual fulfillment: ${new URL('/voyager-initiation', siteUrl).href}` }
}
export function initiationShipmentEmail(pack: 1 | 2 | 3 | 4, siteUrl: string) {
  return { subject: `S26 Initiation Pack ${pack} dispatched`, text: `Your Initiation Pack ${pack} has been dispatched. View your tracking information: ${new URL('/voyager-initiation', siteUrl).href}` }
}
export function initiationCalibrationEmail(siteUrl: string) {
  return { subject: 'Continue your Voyager Calibration', text: `Add your perspective to the Collective with five Signal Calibration questions. You can complete them whenever you are ready: ${new URL('/quiz', siteUrl).href}` }
}
export function initiationConsoleEmail(siteUrl: string) {
  return { subject: 'Your Initiation Console allocation', text: `View your allocated Console and fulfillment progress: ${new URL('/devices/my-consoles', siteUrl).href}. Your four Initiation Pack records remain in Initiation.` }
}
