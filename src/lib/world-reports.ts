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
