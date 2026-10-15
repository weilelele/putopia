/** Pure accumulator: timestamps are monotonic, dwell excludes hidden/modal/idle time. */
export function createEngagementMeter(emit: (event: string, properties: Record<string, unknown>) => void) {
  const sections = new Map<string, { since: number | null; total: number; sent: number; exposed: boolean }>()
  const reached = new Set<number>()
  let last: number | null = null
  let maxDepth = 0
  function sample(now: number, visible: string[], depth: number, active: boolean) {
    const delta = last === null ? 0 : Math.max(0, Math.min(1000, now - last))
    last = now
    for (const name of visible) if (!sections.has(name)) sections.set(name, { since: null, total: 0, sent: 0, exposed: false })
    for (const [section, state] of sections) {
      if (!active || !visible.includes(section)) { state.since = null; continue }
      if (state.since !== null) state.total += delta
      else state.since = now
      if (!state.exposed && now - state.since >= 1000) {
        state.exposed = true
        emit('initiation_section_viewed', { section, continuous_ms: 1000 })
      }
    }
    if (!active) return
    maxDepth = Math.max(maxDepth, Math.min(100, Math.max(0, depth)))
    for (const threshold of [25, 50, 75, 90, 100]) if (maxDepth >= threshold && !reached.has(threshold)) {
      reached.add(threshold)
      emit('initiation_scroll_depth', { depth_percent: threshold })
    }
  }
  function flush() {
    for (const [section, state] of sections) {
      const delta = Math.floor(state.total - state.sent)
      if (delta < 1000) continue
      state.sent += delta
      emit('initiation_section_dwell', { section, active_ms: delta, total_active_ms: Math.floor(state.total), max_depth_percent: Math.floor(maxDepth) })
    }
  }
  return { sample, flush }
}

export function contentDepth(top: number, height: number, viewportBottom: number) {
  if (height <= 0) return 0
  return Math.max(0, Math.min(100, (viewportBottom - top + 2) / height * 100))
}

/** Tall sections use half the viewport as the exposure target, not half their entire height. */
export function sectionVisible(top: number, bottom: number, clipTop: number, clipBottom: number) {
  const height = bottom - top
  const viewport = clipBottom - clipTop
  return height > 0 && viewport > 0 && Math.min(bottom, clipBottom) - Math.max(top, clipTop) >= Math.min(height, viewport) * 0.5
}
