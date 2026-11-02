/**
 * Parallax Array: the Voyager-facing name for the Worlds › Explore device (internally `dreamcatcher`).
 * Copy and the briefing demo timeline only; pure, no DOM, storage or network.
 */
export const PARALLAX_ARRAY = {
  name: 'Parallax Array',
  description: 'Describe a world you have seen. The Parallax Array goes looking for it, and Voyager votes bring it closer round by round.',
  image: '/assets/voyager-briefing/london-device.jpg',
  imageAlt: 'The London Parallax Array, a grey signal detector with a brass lamp, on a wooden bench',
  href: '/worlds/live',
} as const

export type ParallaxArrayUnit = { city: string; label: string; online: boolean }
export const PARALLAX_ARRAY_UNITS: ParallaxArrayUnit[] = [
  { city: 'LONDON', label: 'London', online: true },
  { city: 'US BAY AREA', label: 'US Bay Area', online: false },
]

/** "London is online. US Bay Area is not yet online." */
export function parallaxArrayUnitSummary(units: readonly ParallaxArrayUnit[] = PARALLAX_ARRAY_UNITS): string {
  return units.map(unit => `${unit.label} is ${unit.online ? 'online' : 'not yet online'}.`).join(' ')
}

/** Illustrative observations for the briefing demo, each signed by a fictional Voyager. Images are existing project world references (see the media README). */
export const PARALLAX_ARRAY_EXAMPLES = [
  { from: 'Alan', text: 'After the ash storms, my friends and I moved into a concrete bunker under a dead radio dish. Some nights it still hums.', image: '/assets/voyager-briefing/world-bunker.jpg' },
  { from: 'Mei', text: 'My city drowned years ago. We row between the towers, and the rain has never stopped.', image: '/assets/voyager-briefing/world-flooded.jpg' },
] as const

/**
 * Briefing scene timeline, paced slowly. The words dissolve into the device, then each round gathers more fragments of
 * the world into a small lens; Voyager votes light up around it between rounds. Even the last round stays coarse and
 * noisy: the picture is a received signal, not a finished render.
 */
export const PARALLAX_ARRAY_ROUNDS = 3
export const PARALLAX_ARRAY_CYCLE_MS = 24_000
/** Vote marks around the lens: how many each vote adds, out of the ring's positions. */
export const PARALLAX_ARRAY_VOTE_MARKS = 36
const VOTES = [9, 14] as const
const ROUND_REVEAL = [.3, .65, 1] as const
const ROUND_GRAIN = [9, 16, 26] as const
const START_GRAIN = 6

export type ParallaxArrayStage = 'typing' | 'release' | 'round' | 'vote' | 'continue' | 'fade'
/** `progress` runs 0–1 within the current stage. */
export type ParallaxArrayFrame = { example: number; typed: number; stage: ParallaxArrayStage; round: number; progress: number }

const TYPE = [600, 4600] as const
const RELEASE_END = 6600
const ROUNDS = [[6600, 9400], [11_400, 14_200], [16_200, 19_000]] as const
const CONTINUE_END = 22_800

const unit = (value: number) => Math.max(0, Math.min(1, value))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function parallaxArrayFrame(elapsed: number, textLengths: readonly number[]): ParallaxArrayFrame {
  const time = Math.max(0, elapsed)
  const example = textLengths.length ? Math.floor(time / PARALLAX_ARRAY_CYCLE_MS) % textLengths.length : 0
  const t = time % PARALLAX_ARRAY_CYCLE_MS
  const length = textLengths[example] ?? 0
  const typed = Math.round(length * unit((t - TYPE[0]) / (TYPE[1] - TYPE[0])))
  const at = (stage: ParallaxArrayStage, round: number, start: number, end: number): ParallaxArrayFrame =>
    ({ example, typed, stage, round, progress: unit((t - start) / (end - start)) })
  if (t < TYPE[1]) return at('typing', 0, TYPE[0], TYPE[1])
  if (t < RELEASE_END) return at('release', 0, TYPE[1], RELEASE_END)
  for (let index = 0; index < ROUNDS.length; index++) {
    const [start, end] = ROUNDS[index]
    if (t < end) return at('round', index + 1, start, end)
    const next = ROUNDS[index + 1]
    if (next && t < next[0]) return at('vote', index + 1, end, next[0])
  }
  if (t < CONTINUE_END) return at('continue', PARALLAX_ARRAY_ROUNDS, ROUNDS[2][1], CONTINUE_END)
  return at('fade', PARALLAX_ARRAY_ROUNDS, CONTINUE_END, PARALLAX_ARRAY_CYCLE_MS)
}

/** What the porthole shows: the share of fragments gathered, the pixel grain across it, and the static over it. */
export function parallaxArraySignal(frame: ParallaxArrayFrame): { reveal: number; grain: number; noise: number } {
  let reveal = 0, grain = START_GRAIN
  if (frame.stage === 'round') {
    const i = frame.round - 1, eased = 1 - Math.pow(1 - frame.progress, 2)
    reveal = lerp(i ? ROUND_REVEAL[i - 1] : 0, ROUND_REVEAL[i], eased)
    grain = Math.round(lerp(i ? ROUND_GRAIN[i - 1] : START_GRAIN, ROUND_GRAIN[i], eased))
  } else if (frame.stage === 'vote' || frame.stage === 'continue' || frame.stage === 'fade') {
    reveal = ROUND_REVEAL[frame.round - 1]
    grain = ROUND_GRAIN[frame.round - 1]
    if (frame.stage === 'fade') reveal *= 1 - frame.progress
  }
  return { reveal, grain, noise: lerp(.85, .22, reveal) }
}

/** Lit vote marks (fractional while they arrive one by one). Votes stay lit until the example fades. */
export function parallaxArrayVotes(frame: ParallaxArrayFrame): number {
  const before = (round: number) => VOTES.slice(0, round).reduce((sum, count) => sum + count, 0)
  if (frame.stage === 'vote') return before(frame.round - 1) + VOTES[frame.round - 1] * unit(frame.progress / .75)
  if (frame.stage === 'round') return before(frame.round - 1)
  if (frame.stage === 'continue') return before(VOTES.length)
  if (frame.stage === 'fade') return before(VOTES.length) * (1 - frame.progress)
  return 0
}

/** Left-to-right dissolve while the observation is sent: each character turns to static, then vanishes. */
export function parallaxArrayDissolve(index: number, length: number, progress: number): 'kept' | 'static' | 'gone' {
  const start = length > 1 ? index / (length - 1) * .65 : 0
  return progress < start ? 'kept' : progress < start + .25 ? 'static' : 'gone'
}

const NUMERALS = ['I', 'II', 'III', 'IV']
export function parallaxArrayCaption(frame: ParallaxArrayFrame, city: string): string {
  switch (frame.stage) {
    case 'typing': return `${city} · LISTENING`
    case 'release': return `SENT TO ${city}`
    case 'round': return `ROUND ${NUMERALS[frame.round - 1]} · RECEIVING`
    case 'vote': return `ROUND ${NUMERALS[frame.round - 1]} · VOYAGERS VOTE`
    case 'continue': case 'fade': return 'THE SEARCH CONTINUES'
  }
}
