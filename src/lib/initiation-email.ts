import { INITIATION_PRICES, INITIATION_PRICING_VERSION } from './initiation-pricing'
import type { InitiationOrderKind } from './initiation-types'

/** Pure templates only. No mail is sent by this module. Legacy templates remain separate. */
export function initiationConfirmationEmail(siteUrl: string, kind: InitiationOrderKind = 'standard', receipt?: { amount: number; pricing_version?: string | null }, activationLink?: string | null) {
  const amount = receipt?.amount ?? INITIATION_PRICES[kind].amount
  const historical = receipt && receipt.pricing_version !== INITIATION_PRICING_VERSION
  const contents = kind === 'initial' ? 'Your payment includes member access and Packs 1–2. Console + Pack 4 can be added later for $460.' : kind === 'legacy_upgrade' ? 'Your existing first two Packs are retained without duplication; this payment adds the Console and Pack 4.' : 'Your payment includes member access and all four Packs, including the Console.'
  const initiationUrl = new URL('/voyager-initiation', siteUrl).href
  const summary = `Your US$${amount / 100} one-time ${INITIATION_PRICES[kind].name} payment is confirmed.`
  const terms = historical ? 'Your original purchase terms remain applicable.' : ''
  // Email-checkout buyers who have not set a password yet get a fresh activation link here too.
  const activation = activationLink ? 'Set your password to activate your account and view your records.' : ''
  const [cta, ctaUrl] = activationLink ? ['ACTIVATE ACCOUNT', activationLink] : ['VIEW INITIATION', initiationUrl]
  const paragraphs = [summary, contents, terms, activation].filter(Boolean)
  return {
    subject: `Your $${amount / 100} ${INITIATION_PRICES[kind].name} is confirmed`,
    text: [...paragraphs, '', ...(activationLink ? [`Activate your account: ${activationLink}`] : []), `View actual fulfillment: ${initiationUrl}`].join('\n'),
    html: emailShell(`${INITIATION_PRICES[kind].name} confirmed`, paragraphs, cta, ctaUrl),
  }
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!)

/** The deep-space card shared with the activation email. */
function emailShell(heading: string, paragraphs: string[], cta: string, ctaUrl: string) {
  const href = escapeHtml(ctaUrl)
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background-color:#0A0E27;font-family:'Courier New',Courier,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0A0E27;"><tr><td align="center" style="padding:48px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
      <tr><td align="center" style="padding-bottom:32px;font-size:12px;font-weight:700;letter-spacing:0.3em;color:#FF6B35;">MULTIVERSE COLLECTIVE</td></tr>
      <tr><td style="background-color:#0D1020;padding:40px 32px;">
        <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#F5F5F5;line-height:1.3;">${escapeHtml(heading)}</h1>
        ${paragraphs.map(p => `<p style="margin:0 0 16px 0;font-size:16px;color:#F5F5F5;line-height:1.5;">${escapeHtml(p)}</p>`).join('\n        ')}
        <table cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;"><tr><td style="background-color:#FF6B35;">
          <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;letter-spacing:0.12em;color:#0A0E27;text-decoration:none;">${cta}</a>
        </td></tr></table>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
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
