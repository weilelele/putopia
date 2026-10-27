export const ACTIVATION_HOLDS = [4000, 1820, 1820, 1820] as const
export const ACTIVATION_MOVE = 1100
const RADII = [.46, .30, .22, .20] as const
export const ACTIVATION_CYCLE = ACTIVATION_HOLDS.reduce<number>((total, hold) => total + hold + ACTIVATION_MOVE, 0)

/** Continuous progress and radius, including the last-to-first transition. */
export function activationLightFrame(elapsed: number) {
  let time = Math.max(0, elapsed) % ACTIVATION_CYCLE
  let index = 0
  while (index < ACTIVATION_HOLDS.length - 1 && time >= ACTIVATION_HOLDS[index] + ACTIVATION_MOVE) {
    time -= ACTIVATION_HOLDS[index] + ACTIVATION_MOVE
    index++
  }
  const next = (index + 1) % ACTIVATION_HOLDS.length
  const fraction = Math.min(1, Math.max(0, (time - ACTIVATION_HOLDS[index]) / ACTIVATION_MOVE))
  const progress = fraction * fraction * (3 - 2 * fraction)
  return { index, next, progress, radius: RADII[index] + (RADII[next] - RADII[index]) * progress }
}
