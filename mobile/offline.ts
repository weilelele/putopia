export const OFFLINE_RECENT_STORAGE_KEY = 'mc:offline:recent-channels:v1'
export const MAX_RECENT_CHANNELS = 4

export interface OfflineChannel {
  route: string
  label: string
  description: string
}

export interface OfflineVisit extends OfflineChannel {
  visitedAt: string
}

export const DEFAULT_OFFLINE_CHANNELS: OfflineChannel[] = [
  {
    route: '/worlds',
    label: 'WORLD RECORDS',
    description: 'Return to confirmed parallel-world discoveries when the signal is restored.',
  },
  {
    route: '/devices',
    label: 'DEVICE ARCHIVE',
    description: 'Review the Collective device archive after reconnecting.',
  },
  {
    route: '/intel',
    label: 'INTEL FEED',
    description: 'Receive the latest field intelligence when the uplink returns.',
  },
]

const CHANNELS: OfflineChannel[] = [
  {
    route: '/console',
    label: 'DASHBOARD',
    description: 'Your primary Multiverse Console channel.',
  },
  ...DEFAULT_OFFLINE_CHANNELS,
  {
    route: '/voyagers',
    label: 'VOYAGERS',
    description: 'The Collective member directory.',
  },
  {
    route: '/logs',
    label: 'LOG ENTRIES',
    description: 'Community field reports and observations.',
  },
  {
    route: '/vote',
    label: 'COMMUNITY VOTE',
    description: 'Collective decisions and active transmissions.',
  },
]

export function offlineChannelForRoute(value: unknown): OfflineChannel | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null
  const pathname = value.split(/[?#]/, 1)[0]
  return CHANNELS.find((channel) => (
    pathname === channel.route || pathname.startsWith(`${channel.route}/`)
  )) ?? null
}

export function addRecentOfflineVisit(
  visits: OfflineVisit[],
  channel: OfflineChannel,
  visitedAt = new Date().toISOString(),
): OfflineVisit[] {
  return [
    { ...channel, visitedAt },
    ...visits.filter((visit) => visit.route !== channel.route),
  ].slice(0, MAX_RECENT_CHANNELS)
}

export function parseOfflineVisits(value: string | null): OfflineVisit[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const route = 'route' in item ? item.route : null
      const visitedAt = 'visitedAt' in item ? item.visitedAt : null
      const channel = offlineChannelForRoute(route)
      if (!channel || typeof visitedAt !== 'string' || Number.isNaN(Date.parse(visitedAt))) return []
      return [{ ...channel, visitedAt }]
    }).slice(0, MAX_RECENT_CHANNELS)
  } catch {
    return []
  }
}

export function offlineVisitScript(): string {
  return `
    (function () {
      if (!location.hostname.endsWith('multiverseco.org')) return;
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'offline-visit',
        route: location.pathname + location.search
      }));
    })();
    true;
  `
}
