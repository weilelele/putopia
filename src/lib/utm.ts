const STORAGE_KEY = 'putopia_first_touch_utm'

export interface UtmParams {
  utm_source:   string | null
  utm_medium:   string | null
  utm_campaign: string | null
  utm_content:  string | null
  fbclid:       string | null
  rdt_cid:      string | null
}

export function captureFirstTouch(): void {
  if (typeof window === 'undefined') return

  const sp = new URLSearchParams(window.location.search)
  const incoming: UtmParams = {
    utm_source:   sp.get('utm_source'),
    utm_medium:   sp.get('utm_medium'),
    utm_campaign: sp.get('utm_campaign'),
    utm_content:  sp.get('utm_content'),
    fbclid:       sp.get('fbclid'),
    rdt_cid:      sp.get('rdt_cid'),
  }

  const hasAny = Object.values(incoming).some(v => v !== null)
  if (hasAny) {
    const existing = readStoredParams()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      utm_source:   existing?.utm_source   ?? incoming.utm_source,
      utm_medium:   existing?.utm_medium   ?? incoming.utm_medium,
      utm_campaign: existing?.utm_campaign ?? incoming.utm_campaign,
      utm_content:  existing?.utm_content  ?? incoming.utm_content,
      fbclid:       existing?.fbclid       ?? incoming.fbclid,
      // Reddit click IDs are refreshed on a new Reddit ad click while the
      // original UTM fields keep their first-touch semantics.
      rdt_cid:      incoming.rdt_cid       ?? existing?.rdt_cid ?? null,
    } satisfies UtmParams))
  }
}

export function getFirstTouch(): UtmParams {
  if (typeof window === 'undefined') {
    return emptyParams()
  }
  const stored = readStoredParams()
  if (!stored) {
    // Fall back to current URL params (covers same-session first page)
    const sp = new URLSearchParams(window.location.search)
    return {
      utm_source:   sp.get('utm_source'),
      utm_medium:   sp.get('utm_medium'),
      utm_campaign: sp.get('utm_campaign'),
      utm_content:  sp.get('utm_content'),
      fbclid:       sp.get('fbclid'),
      rdt_cid:      sp.get('rdt_cid'),
    }
  }
  return stored
}

function readStoredParams(): UtmParams | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<UtmParams>
    return { ...emptyParams(), ...parsed }
  } catch {
    return null
  }
}

function emptyParams(): UtmParams {
  return {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    fbclid: null,
    rdt_cid: null,
  }
}
