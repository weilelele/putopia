import { isIP } from 'node:net'
import { isIOSNativeApp } from './app-platform'

export type InitiationMetaAttribution = {
  disabled?: boolean
  event_source_url?: string
  client_ip_address?: string
  client_user_agent?: string
  fbp?: string
  fbc?: string
}

/** Capture the purchaser's browser, never the later Stripe webhook's headers. */
export function captureInitiationMetaAttribution(
  headers: Pick<Headers, 'get'>,
  cookie: (name: string) => string | undefined,
  siteOrigin: string,
): InitiationMetaAttribution {
  const userAgent = headers.get('user-agent') ?? ''
  if (isIOSNativeApp(userAgent)) return { disabled: true }
  const forwarded = headers.get('x-vercel-forwarded-for')
    || headers.get('x-forwarded-for') || headers.get('x-real-ip') || ''
  const ip = forwarded.split(',')[0].trim()
  const attributionCookie = (name: string) => {
    const value = cookie(name)
    return value && value.length <= 512 && /^fb\.\d+\.\d+\.[A-Za-z0-9_.-]+$/.test(value) ? value : undefined
  }
  return {
    event_source_url: new URL('/voyager-initiation', siteOrigin).toString(),
    ...(isIP(ip) ? { client_ip_address: ip } : {}),
    ...(userAgent ? { client_user_agent: userAgent.slice(0, 1024) } : {}),
    ...(attributionCookie('_fbp') ? { fbp: attributionCookie('_fbp') } : {}),
    ...(attributionCookie('_fbc') ? { fbc: attributionCookie('_fbc') } : {}),
  }
}
