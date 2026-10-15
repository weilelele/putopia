import { initiationAdContext } from './initiation-analytics'

/** Runs on every landing/route, so Track 1 survives the path to Initiation. */
export function captureInitiationAdAttribution(search = window.location.search) {
  const incoming = Object.fromEntries(new URLSearchParams(search))
  let stored: unknown = {}
  try { stored = JSON.parse(sessionStorage.getItem('mc:initiation:ad-context') ?? '{}') } catch { /* Storage is optional. */ }
  const context = initiationAdContext(incoming, stored)
  try { sessionStorage.setItem('mc:initiation:ad-context', JSON.stringify(context)) } catch { /* Current-link attribution remains available. */ }
  return context
}
