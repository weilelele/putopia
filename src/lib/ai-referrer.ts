/**
 * Classifies visits that arrive from AI assistants / answer engines, so
 * AI-referred traffic and its conversions can be segmented in PostHog.
 *
 * Pure: callers pass `document.referrer` and the landing URL's query string.
 * Signals, in priority order:
 *   1. `utm_source` — ChatGPT appends `utm_source=chatgpt.com` to cited links,
 *      and it survives when the browser strips the referrer.
 *   2. The referrer host (web) or `android-app://<package>` (Android apps).
 *
 * Google AI Overviews / AI Mode send `google.com` like ordinary search, so they
 * cannot be told apart here; see docs/marketing/geo/07-measurement.zh.md.
 */

export type AiEngine =
  | 'chatgpt'
  | 'perplexity'
  | 'gemini'
  | 'copilot'
  | 'claude'
  | 'grok'
  | 'deepseek'
  | 'meta_ai'
  | 'mistral'
  | 'you'
  | 'phind'
  | 'poe'

export interface AiReferral {
  /** Normalised engine slug, e.g. `chatgpt`. */
  engine: AiEngine
  /** The host, Android package or utm_source value that matched (lowercase). */
  matched: string
  /** Which signal identified the visit. */
  signal: 'utm_source' | 'referrer'
}

/** Web hosts; subdomains also match (e.g. www.perplexity.ai). */
const AI_HOSTS: ReadonlyArray<readonly [string, AiEngine]> = [
  ['chatgpt.com', 'chatgpt'],
  ['chat.openai.com', 'chatgpt'],
  ['perplexity.ai', 'perplexity'],
  ['gemini.google.com', 'gemini'],
  ['bard.google.com', 'gemini'],
  ['copilot.microsoft.com', 'copilot'],
  ['copilot.cloud.microsoft', 'copilot'],
  ['claude.ai', 'claude'],
  ['grok.com', 'grok'],
  ['chat.deepseek.com', 'deepseek'],
  ['meta.ai', 'meta_ai'],
  ['chat.mistral.ai', 'mistral'],
  ['you.com', 'you'],
  ['phind.com', 'phind'],
  ['poe.com', 'poe'],
]

/** Android app packages, seen as `android-app://<package>/` referrers. */
const AI_ANDROID_PACKAGES: ReadonlyArray<readonly [string, AiEngine]> = [
  ['com.openai.chatgpt', 'chatgpt'],
  ['ai.perplexity.app.android', 'perplexity'],
  ['com.google.android.apps.bard', 'gemini'],
  ['com.microsoft.copilot', 'copilot'],
  ['com.anthropic.claude', 'claude'],
  ['ai.x.grok', 'grok'],
  ['com.deepseek.chat', 'deepseek'],
]

/** Bare utm_source names that are not hostnames. */
const AI_UTM_NAMES: Readonly<Record<string, AiEngine>> = {
  chatgpt: 'chatgpt',
  openai: 'chatgpt',
  perplexity: 'perplexity',
  gemini: 'gemini',
  copilot: 'copilot',
  claude: 'claude',
  grok: 'grok',
  deepseek: 'deepseek',
}

function matchHost(host: string): AiEngine | null {
  const h = host.toLowerCase().replace(/\.$/, '')
  for (const [domain, engine] of AI_HOSTS) {
    if (h === domain || h.endsWith(`.${domain}`)) return engine
  }
  return null
}

function classifyUtmSource(raw: string): AiReferral | null {
  const value = raw.trim().toLowerCase()
  if (!value) return null
  const named = AI_UTM_NAMES[value]
  if (named) return { engine: named, matched: value, signal: 'utm_source' }
  // Hostname-style values such as `chatgpt.com` or `www.perplexity.ai`.
  const host = value.replace(/^https?:\/\//, '').split('/')[0]
  const engine = matchHost(host)
  return engine ? { engine, matched: value, signal: 'utm_source' } : null
}

function classifyReferrer(raw: string): AiReferral | null {
  const value = raw.trim()
  if (!value) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol === 'android-app:') {
    const pkg = url.hostname.toLowerCase()
    const hit = AI_ANDROID_PACKAGES.find(([p]) => p === pkg)
    return hit ? { engine: hit[1], matched: pkg, signal: 'referrer' } : null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  const engine = matchHost(url.hostname)
  return engine
    ? { engine, matched: url.hostname.toLowerCase(), signal: 'referrer' }
    : null
}

/**
 * @param referrer `document.referrer` ('' when absent).
 * @param search   The landing URL's query string, with or without `?`.
 */
export function classifyAiReferral(
  referrer: string | null | undefined,
  search: string | null | undefined,
): AiReferral | null {
  const utmSource = new URLSearchParams(search ?? '').get('utm_source')
  return (
    (utmSource ? classifyUtmSource(utmSource) : null) ??
    classifyReferrer(referrer ?? '')
  )
}

/**
 * PostHog super properties for an AI-referred landing.
 * - `session`: attached to every event in this browser session (pageviews,
 *   checkout, registration…), so conversions can be split by AI engine.
 * - `firstTouch`: registered once and kept, for conversions in later sessions.
 */
export function aiReferralProperties(referral: AiReferral) {
  return {
    session: {
      ai_referrer: referral.engine,
      ai_referrer_match: referral.matched,
      ai_referrer_signal: referral.signal,
    },
    firstTouch: {
      first_touch_ai_referrer: referral.engine,
    },
  }
}
