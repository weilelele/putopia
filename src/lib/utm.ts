const STORAGE_KEY = 'putopia_first_touch_utm'

export interface UtmParams {
  utm_source:   string | null
  utm_medium:   string | null
  utm_campaign: string | null
  utm_content:  string | null
  fbclid:       string | null
}

export function captureFirstTouch(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(STORAGE_KEY)) return // already captured

  const sp = new URLSearchParams(window.location.search)
  const utm: UtmParams = {
    utm_source:   sp.get('utm_source'),
    utm_medium:   sp.get('utm_medium'),
    utm_campaign: sp.get('utm_campaign'),
    utm_content:  sp.get('utm_content'),
    fbclid:       sp.get('fbclid'),
  }

  const hasAny = Object.values(utm).some(v => v !== null)
  if (hasAny) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(utm))
  }
}

export function getFirstTouch(): UtmParams {
  if (typeof window === 'undefined') {
    return { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, fbclid: null }
  }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    // Fall back to current URL params (covers same-session first page)
    const sp = new URLSearchParams(window.location.search)
    return {
      utm_source:   sp.get('utm_source'),
      utm_medium:   sp.get('utm_medium'),
      utm_campaign: sp.get('utm_campaign'),
      utm_content:  sp.get('utm_content'),
      fbclid:       sp.get('fbclid'),
    }
  }
  try {
    return JSON.parse(raw) as UtmParams
  } catch {
    return { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, fbclid: null }
  }
}
