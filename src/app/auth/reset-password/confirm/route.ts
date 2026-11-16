import { NextResponse, type NextRequest } from 'next/server'
import { RECOVERY_LINK_COOKIE, RESET_PASSWORD_PATH, recoveryCookieOptions } from '@/lib/supabase/password-recovery'

export function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const validFormat = tokenHash && /^[a-zA-Z0-9_-]{32,256}$/.test(tokenHash)
  const response = NextResponse.redirect(new URL(validFormat ? RESET_PASSWORD_PATH : `${RESET_PASSWORD_PATH}?invalid=1`, request.url))
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')

  // A scanner following the email link must not spend the token. Keep it
  // out of the rendered page and verify it only when the password is submitted.
  if (validFormat) response.cookies.set(RECOVERY_LINK_COOKIE, tokenHash, recoveryCookieOptions)
  return response
}
