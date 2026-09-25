/** Access policy for the five primary product destinations. */
export const PUBLIC_PRIMARY_ROUTES = ['/console', '/intel', '/devices', '/worlds/live', '/voyagers'] as const
const PUBLIC_ENTRY_ROUTES = ['/', '/welcome', '/worlds'] as const

const REGISTRATION_REQUIRED_ROUTES = [
  '/vote',
  '/logs',
] as const

export function isPublicPrimaryRoute(pathname: string): boolean {
  return PUBLIC_PRIMARY_ROUTES.some((route) => pathname === route || pathname === `${route}/`)
}

export function allowsUnregisteredViewer(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/'
  return isPublicPrimaryRoute(pathname)
    || PUBLIC_ENTRY_ROUTES.some((route) => pathname === route || pathname === `${route}/`)
    // Public reading routes only; do not include submission or account pages.
    || /^\/intel\/[^/]+$/.test(path)
    || (/^\/worlds\/[^/]+$/.test(path) && path !== '/worlds/submit')
    || /^\/devices\/batches\/[^/]+(?:\/discussion)?$/.test(path)
}

export function requiresRegistration(pathname: string): boolean {
  return REGISTRATION_REQUIRED_ROUTES.some((route) => pathname === route || pathname === `${route}/`)
}

export function routeWithSearch(pathname: string, search: string): string {
  return `${pathname}${search}`
}
