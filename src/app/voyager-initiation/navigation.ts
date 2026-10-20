/** Only public Device browsing routes may be restored; this never grants a claim. */
export function deviceSourcePath(value: string | null | undefined): string | null {
  if (!value) return null
  if (value === '/devices' || value === '/devices/') return '/devices'
  return /^\/devices\/batches\/[a-z0-9][a-z0-9-]*\/?$/.test(value) ? value.replace(/\/$/, '') : null
}

export function initiationReturnPath(deviceSource: string | null): string {
  const source = deviceSourcePath(deviceSource)
  return source ? `/voyager-initiation?from=${encodeURIComponent(source)}` : '/voyager-initiation'
}

export function initiationLoginPath(deviceSource: string | null, bundle?: 'initial' | 'complete'): string {
  const path = initiationReturnPath(deviceSource)
  const target = bundle ? `${path}${path.includes('?') ? '&' : '?'}bundle=${bundle}` : path
  return `/login?redirect=${encodeURIComponent(target)}`
}

export function consoleDevicePath(source: string | null, entitlementHref: string | null): string {
  return deviceSourcePath(source) ?? deviceSourcePath(entitlementHref) ?? '/devices'
}
