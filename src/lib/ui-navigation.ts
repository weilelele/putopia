/** UI 2.3: content ownership is independent of the route used to arrive. */
export const PRIMARY_NAV = [
  { href: '/console', label: 'DASHBOARD', title: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/intel', label: 'INTEL', title: 'Intel', icon: 'FileText' },
  { href: '/devices', label: 'DEVICES', title: 'Devices', icon: 'DeviceMark' },
  { href: '/worlds/live', label: 'WORLDS', title: 'Worlds', icon: 'Globe' },
  { href: '/voyagers', label: 'VOYAGERS', title: 'Voyagers', icon: 'Users' },
] as const
export function ownerTab(path: string): string | null {
  if (path === '/console') return '/console'
  if (/^\/(intel|vote)(\/|$)/.test(path)) return '/intel'
  if (/^\/devices(\/|$)/.test(path)) return '/devices'
  if (/^\/(worlds|worldflow|signal)(\/|$)/.test(path)) return '/worlds/live'
  if (/^\/(voyagers|profile|logs|voyager-path)(\/|$)/.test(path)) return '/voyagers'
  return null
}
export function isPrimaryRoute(path: string) { return PRIMARY_NAV.some(item => item.href === path) }
export function hasGlobalNavigation(path: string) {
  return path === '/login' || ownerTab(path) !== null && !/^\/(vote|signal|worlds\/submit|devices\/claim)(\/|$)/.test(path)
}
export function fallbackRoute(path: string): string {
  if (/^\/logs\//.test(path)) return '/logs'
  if (/^\/intel\//.test(path)) return '/intel'
  if (/^\/worlds\//.test(path) && path !== '/worlds/live') return '/worlds'
  const discussion = path.match(/^(\/devices\/batches\/[^/]+)\/discussion$/)
  return discussion?.[1] ?? ownerTab(path) ?? '/console'
}
export function routeLabel(path: string): string {
  path = path.split(/[?#]/)[0]
  if (path === '/logs') return 'Voyager Logs'
  if (path === '/profile') return 'My Profile'
  if (path === '/worlds') return 'World Archive'
  return PRIMARY_NAV.find(item => item.href === path)?.title ?? 'previous page'
}
export function safeAppPath(value: string | null, origin: string): string | null {
  if (!value) return null
  try { const url = new URL(value, origin); return url.origin === origin && url.pathname.startsWith('/') ? url.pathname + url.search : null } catch { return null }
}
