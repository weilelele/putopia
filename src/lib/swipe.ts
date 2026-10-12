export type SwipeDirection = 'next' | 'prev'

/**
 * Decides whether a touch is a deliberate horizontal swipe. Swiping left moves
 * on to the next item, swiping right goes back. Touches that start at a screen
 * edge are ignored so the system back gesture keeps working.
 */
export function swipeDirection(m: {
  startX: number; startY: number; endX: number; endY: number; viewportWidth: number
}, opts: { minDistance?: number; edge?: number } = {}): SwipeDirection | null {
  const { minDistance = 70, edge = 24 } = opts
  if (m.startX < edge || m.startX > m.viewportWidth - edge) return null
  const dx = m.endX - m.startX
  const dy = m.endY - m.startY
  if (Math.abs(dx) < minDistance || Math.abs(dx) < Math.abs(dy) * 2) return null
  return dx < 0 ? 'next' : 'prev'
}
