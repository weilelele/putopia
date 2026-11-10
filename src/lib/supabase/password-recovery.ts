import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const RESET_PASSWORD_PATH = '/auth/reset-password'
export const RECOVERY_LINK_COOKIE = 'mc-recovery-link'
const RECOVERY_SESSION_COOKIE = 'mc-recovery-session'

export const recoveryCookieOptions = {
  path: RESET_PASSWORD_PATH,
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 15 * 60,
} as const

type CookieStore = Awaited<ReturnType<typeof cookies>>

function isRecoverySessionCookie(name: string) {
  return name === RECOVERY_SESSION_COOKIE || name.startsWith(`${RECOVERY_SESSION_COOKIE}.`)
}

export function hasRecoveryContext(store: CookieStore) {
  return store.has(RECOVERY_LINK_COOKIE) || store.getAll().some(({ name }) => isRecoverySessionCookie(name))
}

export function clearRecoveryContext(store: CookieStore) {
  for (const { name } of store.getAll()) {
    if (name === RECOVERY_LINK_COOKIE || isRecoverySessionCookie(name)) {
      store.set(name, '', { ...recoveryCookieOptions, maxAge: 0 })
    }
  }
}

// A recovery session is server-only and never replaces the browser's login
// session. It lets users retry after Supabase rejects a new password.
export function createRecoveryClient(store: CookieStore) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: RECOVERY_SESSION_COOKIE, ...recoveryCookieOptions },
      cookies: {
        getAll: () => store.getAll().filter(({ name }) => isRecoverySessionCookie(name)),
        setAll: (entries) => {
          for (const { name, value, options } of entries) {
            store.set(name, value, { ...options, ...recoveryCookieOptions, maxAge: options.maxAge === 0 ? 0 : recoveryCookieOptions.maxAge })
          }
        },
      },
    },
  )
}
