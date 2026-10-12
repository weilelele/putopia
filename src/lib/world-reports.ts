export type ReportKind = 'observation' | 'anomaly'

export type WorldReportView = {
  id: string
  kind: ReportKind
  /** Profile to open on tap. */
  authorId: string
  authorName: string
  authorAvatar: string | null
  body: string
  images: string[]
  at: string // YYYY-MM-DD
  /** True for the observation an architect designated as the world's first observer. */
  isFirstObserver: boolean
}

export type WorldReportStats = { seen: number; anomalies: number }

/** Seen = distinct observation authors; anomalies = anomaly report count. */
export function aggregateReportStats(rows: { world_id: string; kind: ReportKind; author_id: string }[]): Record<string, WorldReportStats> {
  const observers = new Map<string, Set<string>>()
  const out: Record<string, WorldReportStats> = {}
  for (const row of rows) {
    out[row.world_id] ??= { seen: 0, anomalies: 0 }
    if (row.kind === 'anomaly') out[row.world_id].anomalies += 1
    else {
      const set = observers.get(row.world_id) ?? new Set<string>()
      set.add(row.author_id)
      observers.set(row.world_id, set)
    }
  }
  for (const [worldId, set] of observers) out[worldId].seen = set.size
  return out
}

/**
 * Whether a report can be designated the first observer of a world: only
 * official worlds have the fuzzy state, and only a visible observation of that
 * world qualifies. Returns an error message, or null when valid.
 */
export function validateDesignation(
  world: { id: string; lifecycle_state: string },
  report: { world_id: string; kind: string; is_visible: boolean } | null,
): string | null {
  if (!world.id.startsWith('WLD-')) return 'Only official worlds have a first observer to designate.'
  if (world.lifecycle_state !== 'stable') return 'This world is not open for observation.'
  if (!report || report.world_id !== world.id) return 'That report does not belong to this world.'
  if (report.kind !== 'observation') return 'Only an observation can be designated.'
  if (!report.is_visible) return 'That report is hidden.'
  return null
}
