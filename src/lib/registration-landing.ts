import { safeAppPath } from './ui-navigation'

export const ACTIVATION_WELCOME_PATH = '/register/complete'

/** Show the welcome after ordinary activation; explicit tasks keep their existing return path. */
export function registrationLandingPath(value: string | null, origin: string, remembered: string | null = null): string {
  const safe = safeAppPath(value, origin) ?? safeAppPath(remembered, origin)
  if (!safe) return ACTIVATION_WELCOME_PATH
  const pathname = safe.split('?')[0].replace(/\/$/, '') || '/'
  if (pathname === '/console' || /^\/(?:login|register|auth)(?:\/|$)/.test(pathname)) return ACTIVATION_WELCOME_PATH
  return safe
}
