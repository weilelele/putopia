/** Only public Device browsing routes may be restored; this never grants a claim. */
export function deviceSourcePath(value: string | null | undefined): string | null {
  if (!value) return null
  if (value === '/devices' || value === '/devices/') return '/devices'
  return /^\/devices\/batches\/[a-z0-9][a-z0-9-]*\/?$/.test(value) ? value.replace(/\/$/, '') : null
}

export function initiationReturnPath(deviceSource: string | null, bundle?: 'initial' | 'standard'): string {
  const source = deviceSourcePath(deviceSource)
  const path = source ? `/voyager-initiation?from=${encodeURIComponent(source)}` : '/voyager-initiation'
  return bundle ? `${path}${source ? '&' : '?'}bundle=${bundle}` : path
}

export function initiationLoginPath(deviceSource: string | null, bundle?: 'initial' | 'standard'): string {
  return `/login?redirect=${encodeURIComponent(initiationReturnPath(deviceSource, bundle))}`
}

export function consoleDevicePath(source: string | null, entitlementHref: string | null): string {
  return deviceSourcePath(source) ?? deviceSourcePath(entitlementHref) ?? '/devices'
}
