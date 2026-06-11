/**
 * Client-safe crop/filter constants & types for Signal Tasks.
 *
 * Kept separate from process.ts (which imports sharp + the server-only Supabase
 * client) so client components can import these without pulling server modules
 * into the browser bundle.
 */
export type CropShape = 'square' | 'circle' | 'rect'
export type FilterPreset = 'signal_decay' | 'chromatic' | 'glitch_art' | 'static_noise'

export const FILTER_PRESETS: FilterPreset[] = [
  'signal_decay',
  'chromatic',
  'glitch_art',
  'static_noise',
]

export interface CropConfig {
  shape: CropShape
  /** fraction of the source frame AREA to keep (default 1/6–1/5). */
  areaRatio: number
  /** "w:h" when shape === 'rect'. Ignored otherwise. */
  aspect?: string
  /** center position as fractions, or 'random'. */
  position?: { x: number; y: number } | 'random'
  /** 0–100 glitch strength. */
  glitchIntensity: number
  /** which glitch style to apply. */
  filter: FilterPreset
}

export const DEFAULT_CROP: CropConfig = {
  shape: 'square',
  areaRatio: 1 / 6,
  glitchIntensity: 50,
  filter: 'signal_decay',
}
