import { safeAppPath } from './ui-navigation'

// Sign-up via /new ends in an invite email whose link cannot carry a return
// path (GoTrue drops redirect_to query strings), so /register would otherwise
// always land on /console. /new remembers where the visitor came from in this
// browser; /register takes it once registration is complete.
const KEY = 'mc:post-register-redirect'
const TTL_MS = 7 * 24 * 60 * 60 * 1000

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function rememberPostRegisterRedirect(store: Store, path: string | null, origin: string, now: number): void {
  const safe = safeAppPath(path, origin)
  if (!safe || safe.startsWith('/login') || safe.startsWith('/register') || safe.startsWith('/new')) return
  try { store.setItem(KEY, JSON.stringify({ path: safe, at: now })) } catch { /* Storage is a convenience only. */ }
}

/** The remembered path (removed once read), or null when absent, stale or unsafe. */
export function takePostRegisterRedirect(store: Store, origin: string, now: number): string | null {
  try {
    const raw = store.getItem(KEY)
    store.removeItem(KEY)
    const saved = raw ? JSON.parse(raw) as { path?: unknown; at?: unknown } : null
    if (!saved || typeof saved.path !== 'string' || typeof saved.at !== 'number' || now - saved.at > TTL_MS) return null
    return safeAppPath(saved.path, origin)
  } catch {
    return null
  }
}
