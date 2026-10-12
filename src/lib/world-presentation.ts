/**
 * Presentation rules for a world's by-line and tags.
 *
 * - Official worlds (`WLD-…`) start as fuzzy signals with no observer. The first
 *   user whose observation report is accepted becomes the "by" and first
 *   observer; until then the world is tagged FUZZY SIGNAL.
 * - User-discovered worlds were tuned from scratch by their discoverer, who is
 *   the "by".
 * Content tags are keyword heuristics over the world's text, not stored.
 */

export const FUZZY_TAG = 'FUZZY SIGNAL'

/**
 * What a world actually contains, not its genre (names kept short so a card's tags stay on one row): the product treats every world
 * as real, so there is no sci-fi / fantasy. Matched against name + description.
 */
const THEMES: { tag: string; words: RegExp }[] = [
  { tag: 'ALIEN', words: /\b(alien|aliens|extraterrestrial|space|spaceship|planet|interstellar|orbit|star|stars|moon|cosmos|void)\b/i },
  { tag: 'RUINS', words: /\b(abandoned|ruins?|derelict|empty|collapsed|mineshaft|overgrown|deserted|left behind|forgotten|disused)\b/i },
  { tag: 'WILD', words: /\b(forest|mountains?|desert|field|fields|trees?|rocks?|sand|valley|cliff|cave|jungle|meadow|snow)\b/i },
  { tag: 'WATERS', words: /\b(lake|sea|ocean|river|waves?|shore|beach|rain|island|harbou?r|flood)\b/i },
  { tag: 'CITY', words: /\b(city|street|streets|supermarket|station|building|buildings|train|market|apartment|mall|office|road|neon)\b/i },
  { tag: 'MACHINES', words: /\b(android|robots?|machines?|engine|device|devices|clock|computer|electric|mechanical|drone)\b/i },
  { tag: 'BEINGS', words: /\b(creatures?|animals?|birds?|fish|cats?|dogs?|people|residents|child|children|girl|boy|pixie|insects?)\b/i },
]
export const WORLD_TAGS = THEMES.map((t) => t.tag)

export type WorldByline = {
  name: string
  /** Profile to open on tap; null when there is no real profile to show. */
  profileId: string | null
  /** True when an official world has no observer yet. */
  pending: boolean
}

export function isOfficialWorld(worldId: string): boolean {
  return worldId.startsWith('WLD-')
}

/** An official world nobody has observed yet. */
export function isFuzzyWorld(worldId: string, firstObserver: unknown): boolean {
  return isOfficialWorld(worldId) && !firstObserver
}

/**
 * Content tags read from the world's own text (up to three). Worlds that match
 * nothing simply carry no tag. Official worlds still fuzzy get FUZZY SIGNAL first.
 */
export function worldTags(world: { id: string; name: string; name_en?: string | null; description?: string | null }, fuzzy = false): string[] {
  const text = `${world.name} ${world.name_en ?? ''} ${world.description ?? ''}`
  const themes = THEMES.filter((t) => t.words.test(text)).map((t) => t.tag).slice(0, 3)
  return fuzzy ? [FUZZY_TAG, ...themes] : themes
}

/** Filter chips: FUZZY SIGNAL right after ALL, then content tags in a fixed order. */
export function orderedFilterTags(present: string[]): string[] {
  const set = new Set(present)
  return [FUZZY_TAG, ...WORLD_TAGS].filter((t) => set.has(t))
}

/** Never show a raw email as a public name. */
export function publicName(name: string | null | undefined): string {
  if (!name) return 'UNKNOWN'
  return name.includes('@') ? name.split('@')[0] : name
}

export function worldByline(
  world: { id: string; discoverer_id: string | null; discoverer_name: string | null },
  firstObserver: { id: string; name: string } | null,
): WorldByline {
  if (isOfficialWorld(world.id)) {
    return firstObserver
      ? { name: firstObserver.name, profileId: firstObserver.id, pending: false }
      : { name: 'NO OBSERVER YET', profileId: null, pending: true }
  }
  return { name: publicName(world.discoverer_name), profileId: world.discoverer_id, pending: false }
}
