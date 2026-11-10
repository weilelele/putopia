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
    ? 'Your Voyager Initiation checkout is linked to this email. Set your access code to activate your account, then view your membership and delivery records in Initiation.'
    : 'Set your access code to activate your account. Then continue exploring the Collective and the Multiverse Console.'
  const subject = 'Welcome to Multiverse Collective'
  const recoveryLink = new URL('/auth/expired', link).href
  const logoUrl = new URL('/assets/vi-wordmark.png', link).href
  const footer = 'If you didn’t request this email, you can ignore it.'
  const href = escapeHtml(link)
  return {
    subject,
    text: [subject + '.', '', intro, '', `ACTIVATE ACCOUNT: ${link}`, '', 'Valid for 24 hours.', `Get a new link: ${recoveryLink}`, '', footer].join('\n'),
    html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;background:#080C20;color:#F5F5F5;font-family:'Courier Prime','Courier New',Courier,monospace;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Set your access code and continue exploring.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080C20;"><tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td style="padding:0 8px 28px;"><img src="${escapeHtml(logoUrl)}" width="180" alt="Multiverse Collective" style="display:block;width:180px;max-width:100%;height:auto;border:0;"></td></tr>
      <tr><td style="background:#10162D;padding:28px 24px;">
        <h1 style="font-size:24px;line-height:1.25;font-weight:700;margin:0 0 20px;">Welcome to<br>Multiverse Collective.</h1>
        <p style="font-size:16px;line-height:1.5;margin:0 0 24px;">${escapeHtml(intro)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#E35205"><a href="${href}" style="display:block;padding:16px 12px;color:#10162D;font-size:16px;line-height:1.4;font-weight:700;text-decoration:none;">ACTIVATE ACCOUNT</a></td></tr></table>
        <p style="font-size:13px;line-height:1.5;color:rgba(245,245,245,0.7);margin:16px 0 0;">Valid for 24 hours. <a href="${escapeHtml(recoveryLink)}" style="color:#F2783E;text-decoration:underline;">Get a new link</a>.</p>
      </td></tr>
      <tr><td style="padding:24px 8px 0;font-size:12px;line-height:1.5;color:rgba(245,245,245,0.7);">
        <p style="margin:0 0 12px;">Button not working? <a href="${href}" style="color:#F2783E;text-decoration:underline;">Open this link</a>.</p>
        <p style="margin:0;">${escapeHtml(footer)}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
  }
}
