import type { Vote } from '@/types/database'
export type DashboardUpdate = { id: string; occurredAt: string; category: string; title: string; description?: string; image?: string | null; href: string; locked?: boolean }
export type DashboardEvent = { id: string; kind: string; title: string; description: string; href: string; action: string; image?: string; endsAt?: string | null }
/** The two collections intentionally do not deduplicate against each other. */
export function latestUpdates(updates: DashboardUpdate[], votes: Pick<Vote, 'id' | 'title' | 'created_at'>[]): DashboardUpdate[] {
  const content = updates.map(item => ({ ...item, description: item.locked ? undefined : item.description, image: item.locked ? null : item.image }))
  const opened = votes.map(v => ({ id: `vote-${v.id}`, occurredAt: v.created_at, category: 'Vote opened', title: v.title, href: '/vote' }))
  return [...new Map([...content, ...opened].map(item => [item.id, item])).values()]
    .filter(item => Number.isFinite(Date.parse(item.occurredAt)))
    .sort((a,b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.id.localeCompare(b.id)).slice(0,10)
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
