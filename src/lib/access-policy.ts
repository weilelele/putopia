/** Access policy for the five primary product destinations. */
export const PUBLIC_PRIMARY_ROUTES = ['/console', '/devices'] as const
export const REGISTERED_PRIMARY_ROUTES = ['/intel', '/worlds/live', '/voyagers'] as const
const PUBLIC_ENTRY_ROUTES = ['/', '/welcome'] as const

const REGISTRATION_REQUIRED_ROUTES = [
  ...REGISTERED_PRIMARY_ROUTES,
  '/worlds',
  '/vote',
  '/logs',
] as const

export function isPublicPrimaryRoute(pathname: string): boolean {
  return PUBLIC_PRIMARY_ROUTES.some((route) => pathname === route || pathname === `${route}/`)
}

export function allowsUnregisteredViewer(pathname: string): boolean {
  return isPublicPrimaryRoute(pathname)
    || PUBLIC_ENTRY_ROUTES.some((route) => pathname === route || pathname === `${route}/`)
}

export function requiresRegistration(pathname: string): boolean {
  return REGISTRATION_REQUIRED_ROUTES.some((route) => pathname === route || pathname === `${route}/`)
}

export function routeWithSearch(pathname: string, search: string): string {
  return `${pathname}${search}`
}
