import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'mc_investor_deck_access'
const COOKIE_SCOPE = '/'
const FALLBACK_PASSWORD = 'mc2026'

function configuredPassword() {
  return process.env.INVESTOR_DECK_PASSWORD ?? FALLBACK_PASSWORD
}

function digest(value: string) {
  return createHash('sha256').update(value).digest()
}

function accessToken() {
  return createHash('sha256')
    .update(`multiverse-investor-deck:v1:${configuredPassword()}`)
    .digest('hex')
}

export function isValidDeckPassword(value: string) {
  return timingSafeEqual(digest(value), digest(configuredPassword()))
}

export async function grantDeckAccess() {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, accessToken(), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: COOKIE_SCOPE,
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function hasDeckAccess() {
  const cookieStore = await cookies()
  const supplied = cookieStore.get(COOKIE_NAME)?.value
  if (!supplied) return false

  return timingSafeEqual(digest(supplied), digest(accessToken()))
}
