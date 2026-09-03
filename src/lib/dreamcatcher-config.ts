export type DreamcatcherConfig = {
  slug: string
  code: string
  name: string
  city: string
  country: string
  location: string
  time_zone: string
  round_duration_minutes: number
  queue_capacity: number
}

export const EMPTY_DREAMCATCHER: DreamcatcherConfig = {
  slug: '', code: '', name: '', city: '', country: '', location: '',
  time_zone: 'UTC', round_duration_minutes: 8, queue_capacity: 50,
}

export function dreamcatcherConfig(record: DreamcatcherConfig): DreamcatcherConfig {
  return {
    slug: record.slug, code: record.code, name: record.name, city: record.city,
    country: record.country, location: record.location, time_zone: record.time_zone,
    round_duration_minutes: record.round_duration_minutes, queue_capacity: record.queue_capacity,
  }
}

export function validateDreamcatcherConfig(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Invalid device details.'
  const input = value as Record<string, unknown>
  const fields = { slug: 80, code: 40, name: 160, city: 120, country: 120, location: 240, time_zone: 80 }
  for (const [field, limit] of Object.entries(fields)) {
    if (typeof input[field] !== 'string' || !input[field].trim() || input[field].length > limit) {
      return `${field.replaceAll('_', ' ')} is required (maximum ${limit} characters).`
    }
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test((input.slug as string).trim())) return 'Device ID must use lowercase letters, numbers and single hyphens.'
  if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test((input.code as string).trim())) return 'Device code must use letters, numbers and single hyphens.'
  const timeZone = (input.time_zone as string).trim()
  try {
    if (timeZone !== 'UTC' && !timeZone.includes('/')) return 'Use a time zone such as Asia/Tokyo, Europe/London or UTC.'
    new Intl.DateTimeFormat('en', { timeZone }).format(0)
  } catch {
    return 'Unknown time zone. Use a value such as Asia/Tokyo or Europe/London.'
  }
  if (!Number.isInteger(input.round_duration_minutes) || Number(input.round_duration_minutes) < 8 || Number(input.round_duration_minutes) > 10) {
    return 'Round duration must be 8, 9 or 10 minutes.'
  }
  if (!Number.isInteger(input.queue_capacity) || Number(input.queue_capacity) < 1 || Number(input.queue_capacity) > 500) {
    return 'Waiting capacity must be a whole number between 1 and 500.'
  }
  return null
}

export type DreamcatcherSaveInput =
  | { mode: 'create'; config: DreamcatcherConfig }
  | { mode: 'edit'; id: string; config: DreamcatcherConfig; expected: DreamcatcherConfig }

type WritePlan =
  | { error: string }
  | { error: null; mode: 'create'; values: DreamcatcherConfig & { is_public: false; status: 'idle' } }
  | { error: null; mode: 'edit'; id: string; values: Omit<DreamcatcherConfig, 'slug'>; expected: DreamcatcherConfig }

export function planDreamcatcherSave(value: unknown): WritePlan {
  if (!value || typeof value !== 'object') return { error: 'Invalid save request.' }
  const input = value as DreamcatcherSaveInput
  if (input.mode !== 'create' && input.mode !== 'edit') return { error: 'Invalid save request.' }
  const error = validateDreamcatcherConfig(input.config)
  if (error) return { error }
  const config = dreamcatcherConfig(input.config)
  const normalized = {
    ...config, slug: config.slug.trim(), code: config.code.trim().toUpperCase(), name: config.name.trim(),
    city: config.city.trim(), country: config.country.trim(), location: config.location.trim(), time_zone: config.time_zone.trim(),
  }
  if (input.mode === 'create') return { error: null, mode: 'create', values: { ...normalized, is_public: false, status: 'idle' } }
  if (typeof input.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)) {
    return { error: 'Invalid device ID.' }
  }
  if (validateDreamcatcherConfig(input.expected)) return { error: 'Original device details are missing. Reload before editing.' }
  const { slug, ...editable } = normalized
  if (slug !== input.expected.slug) return { error: 'The device ID cannot be changed after creation.' }
  return { error: null, mode: 'edit', id: input.id, values: editable, expected: dreamcatcherConfig(input.expected) }
}
