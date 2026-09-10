import type { Vote } from '@/types/database'
export type DashboardUpdate = { id: string; occurredAt: string; category: string; title: string; description?: string; image?: string | null; href: string; locked?: boolean; images?: string[]; authorName?: string; authorAvatar?: string | null; entityKey?: string }
export type DashboardEvent = { id: string; kind: string; title: string; description: string; href: string; action: string; image?: string; endsAt?: string | null }
const UPDATE_CATEGORIES = new Set(['Intel', 'Voyager activated', 'Established world', 'Device update'])
const UPDATE_CAPS = new Map([['Voyager activated', 2], ['Established world', 3]])
const VOYAGER_UPDATE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

/** Apply the approved Dashboard pool rules, then keep the ten newest entries. */
export function latestUpdates(updates: DashboardUpdate[], now = Date.now()): DashboardUpdate[] {
  const counts = new Map<string, number>()
  const entities = new Set<string>()
  const result: DashboardUpdate[] = []
  const content = [...new Map(updates.map(item => [item.id, item])).values()]
    .filter(item => UPDATE_CATEGORIES.has(item.category) && Number.isFinite(Date.parse(item.occurredAt)))
    .sort((a,b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.id.localeCompare(b.id))

  for (const item of content) {
    if (item.category === 'Voyager activated' && now - Date.parse(item.occurredAt) > VOYAGER_UPDATE_WINDOW_MS) continue
    if (item.entityKey && entities.has(item.entityKey)) continue
    const cap = UPDATE_CAPS.get(item.category)
    const count = counts.get(item.category) ?? 0
    if (cap !== undefined && count >= cap) continue

    result.push({
      ...item,
      description: item.locked ? undefined : item.description,
      image: item.locked ? null : item.image,
      images: item.locked ? undefined : item.images,
      authorName: item.locked ? undefined : item.authorName,
      authorAvatar: item.locked ? null : item.authorAvatar,
    })
    counts.set(item.category, count + 1)
    if (item.entityKey) entities.add(item.entityKey)
    if (result.length === 10) break
  }
  return result
}
export function availableVotes(votes: Vote[], role: string, responses: { vote_id: string }[], now: number) {
  const completed = new Set(responses.map(r => r.vote_id))
  return votes.filter(v => v.is_active && v.scope.some(r => r === role) && !completed.has(v.id) && (!v.ends_at || Date.parse(v.ends_at) > now))
    .sort((a,b) => (a.ends_at ? Date.parse(a.ends_at) : Infinity) - (b.ends_at ? Date.parse(b.ends_at) : Infinity) || a.id.localeCompare(b.id))
}

/** Visibility is public; voting eligibility remains enforced by the destination flow. */
export function visibleEventVotes(votes: Vote[], now: number) {
  return votes.filter(v => v.is_active && (!v.ends_at || Date.parse(v.ends_at) > now))
    .sort((a,b) => (a.ends_at ? Date.parse(a.ends_at) : Infinity) - (b.ends_at ? Date.parse(b.ends_at) : Infinity) || a.id.localeCompare(b.id))
}

export function dashboardEventVotes(votes: Vote[], role: string, responses: { vote_id: string }[], now: number, guest: boolean) {
  return (guest ? visibleEventVotes(votes, now) : availableVotes(votes, role, responses, now)).slice(0, 3)
}

export type OpenTuningWorld = { id: string; name: string; openedAt: string }
export function dashboardTuningWorlds(worlds: OpenTuningWorld[], awaitingWorldIds: string[], guest: boolean) {
  const awaiting = new Set(awaitingWorldIds)
  return worlds
    .filter(world => Number.isFinite(Date.parse(world.openedAt)) && (guest || awaiting.has(world.id)))
    .sort((a,b) => Date.parse(b.openedAt) - Date.parse(a.openedAt) || a.id.localeCompare(b.id))
    .slice(0, 3)
}

/** Put one of each action type first; keep every available event in the rail. */
export function orderDashboardEvents(events: DashboardEvent[]) {
  const groups = new Map<string, DashboardEvent[]>()
  for (const event of events) groups.set(event.kind, [...(groups.get(event.kind) ?? []), event])
  const ordered: DashboardEvent[] = []
  for (let index = 0; ordered.length < events.length; index++) {
    for (const group of groups.values()) if (group[index]) ordered.push(group[index])
  }
  return ordered
}
