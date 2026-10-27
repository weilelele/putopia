// Pure rules for the account activation link. The link is ours, not a Supabase
// one-time token: it stays usable for 24 hours until the account sets a password,
// so opening it twice, or an inbox scanner opening it first, never burns it.
import { createHmac, timingSafeEqual } from 'node:crypto'

export const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000

export type ActivationClaims = { userId: string; next: string | null; expiresAt: number }
export type ActivationPurpose = 'signup' | 'initiation'

const b64 = (value: Buffer | string) => Buffer.from(value).toString('base64url')
const sign = (body: string, secret: string) => createHmac('sha256', secret).update(body).digest()

export function createActivationToken(input: { userId: string; next?: string | null; now: number }, secret: string): string {
  const body = b64(JSON.stringify({ u: input.userId, n: input.next ?? null, x: input.now + ACTIVATION_TTL_MS }))
  return `${body}.${b64(sign(body, secret))}`
}

/** Verify identity for status checks only. Expiry is still enforced by readActivationToken before any activation. */
export function verifyActivationToken(token: unknown, secret: string): ActivationClaims | null {
  if (typeof token !== 'string' || token.length > 1024) return null
  const [body, mac, extra] = token.split('.')
  if (!body || !mac || extra !== undefined) return null
  const expected = sign(body, secret)
  const supplied = Buffer.from(mac, 'base64url')
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { u?: unknown; n?: unknown; x?: unknown }
    if (typeof claims.u !== 'string' || !claims.u || typeof claims.x !== 'number' || !Number.isFinite(claims.x)) return null
    return { userId: claims.u, next: typeof claims.n === 'string' && claims.n.startsWith('/') && !claims.n.startsWith('//') ? claims.n : null, expiresAt: claims.x }
  } catch {
    return null
  }
}

/** The claims of a genuine, unexpired token, or null. Required before setting credentials. */
export function readActivationToken(token: unknown, secret: string, now: number): ActivationClaims | null {
  const claims = verifyActivationToken(token, secret)
  return claims && claims.expiresAt > now ? claims : null
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!)

/** The activation email. Initiation buyers read why their checkout needs it. */
export function activationEmail(link: string, purpose: ActivationPurpose) {
  const intro = purpose === 'initiation'
    ? 'Your Voyager Initiation checkout is linked to this email. Set your password to activate your account, then view your membership and delivery records in Initiation.'
    : 'Set your password to activate your Multiverse Collective account.'
  const footer = 'This link works for 24 hours, until your password is set. If you did not request this, you can ignore this email.'
  const href = escapeHtml(link)
  return {
    subject: 'Activate your Multiverse Collective account',
    text: [intro, '', `Activate your account: ${link}`, '', footer].join('\n'),
    html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Activate your account</title></head>
<body style="margin:0;padding:0;background-color:#0A0E27;font-family:'Courier New',Courier,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0A0E27;"><tr><td align="center" style="padding:48px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
      <tr><td align="center" style="padding-bottom:32px;font-size:12px;font-weight:700;letter-spacing:0.3em;color:#FF6B35;">MULTIVERSE COLLECTIVE</td></tr>
      <tr><td style="background-color:#0D1020;padding:40px 32px;">
        <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#F5F5F5;line-height:1.3;">Activate your account</h1>
        <p style="margin:0 0 32px 0;font-size:16px;color:#F5F5F5;line-height:1.5;">${escapeHtml(intro)}</p>
        <table cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#FF6B35;">
          <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;letter-spacing:0.12em;color:#0A0E27;text-decoration:none;">ACTIVATE ACCOUNT</a>
        </td></tr></table>
        <p style="margin:24px 0 0 0;font-size:12px;color:#8A93A8;line-height:1.6;">If the button does not work, paste this URL into your browser:<br /><a href="${href}" style="color:#FF6B35;word-break:break-all;">${href}</a></p>
      </td></tr>
      <tr><td style="padding-top:24px;font-size:12px;color:#8A93A8;text-align:center;line-height:1.6;">${escapeHtml(footer)}</td></tr>
    </table>
  </td></tr></table>
</body></html>`,
  }
}
