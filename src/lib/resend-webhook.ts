/**
 * Resend inbound-webhook helpers.
 *
 * Resend signs webhooks with the Svix scheme (headers: svix-id, svix-timestamp,
 * svix-signature; secret looks like `whsec_<base64>`). We verify the HMAC by
 * hand to avoid pulling in the svix SDK — the scheme is small and stable.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export type SvixHeaders = { id: string; timestamp: string; signature: string }

/** Verify a Svix-signed payload. `secret` is the `whsec_...` value from Resend. */
export function verifySvixSignature(rawBody: string, headers: SvixHeaders, secret: string): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature) return false
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const signedContent = `${headers.id}.${headers.timestamp}.${rawBody}`
  const expected = createHmac('sha256', key).update(signedContent).digest('base64')
  // svix-signature is a space-separated list of `v1,<base64sig>` tokens.
  return headers.signature.split(' ').some((token) => {
    const sig = token.includes(',') ? token.slice(token.indexOf(',') + 1) : token
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    return a.length === b.length && timingSafeEqual(a, b)
  })
}

/** Pull the bare address out of `"Name <a@b.com>"` or `"a@b.com"`. Lower-cased. */
export function parseEmailAddress(input: string | null | undefined): string | null {
  if (!input) return null
  const angle = input.match(/<([^>]+)>/)
  const raw = (angle ? angle[1] : input).trim().toLowerCase()
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw) ? raw : null
}

/**
 * Extract the campaign reply-token from a plus-addressed recipient, e.g.
 * `replies+ab12cd@inbound.multiverseco.org` -> `ab12cd`.
 */
export function extractReplyToken(toAddresses: Array<string | null | undefined>): string | null {
  for (const addr of toAddresses) {
    const email = parseEmailAddress(addr)
    if (!email) continue
    const local = email.slice(0, email.indexOf('@'))
    const plus = local.indexOf('+')
    if (plus >= 0) {
      const token = local.slice(plus + 1)
      if (token) return token
    }
  }
  return null
}
