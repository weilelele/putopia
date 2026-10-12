import type { VoyagerProfileUpdate } from '@/types/database'

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const memberFields = new Set(['display_name', 'bio', 'location', 'social_x', 'social_instagram', 'social_linkedin', 'observation_days', 'worlds_discovered'])

export function validateProfileUpdate(raw: unknown, role: string): { updates: VoyagerProfileUpdate; error: null } | { updates: null; error: string } {
  const fail = (error: string) => ({ updates: null, error })
  if (!['applicant', 'voyager', 'architect'].includes(role)) return fail('Profile editing is not available for this account.')
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail('Invalid profile update.')
  const entries = Object.entries(raw)
  if (!entries.length) return fail('No profile changes provided.')
  const clean: Record<string, string | number | null> = {}
  for (const [key, value] of entries) {
    if (!memberFields.has(key) || (role === 'applicant' && key !== 'display_name')) return fail('This profile field cannot be edited by your account.')
    if (key === 'display_name') {
      if (typeof value !== 'string') return fail('Enter a display name between 1 and 60 characters.')
      const name = value.trim()
      if (!name || Array.from(name).length > 60 || /[\u0000-\u001f\u007f]/.test(name)) return fail('Enter a display name between 1 and 60 characters without control characters.')
      clean[key] = name
    } else if (key === 'observation_days' || key === 'worlds_discovered') {
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 2147483647) return fail('Profile counts must be non-negative whole numbers.')
      clean[key] = value
    } else {
      if (value !== null && (typeof value !== 'string' || value.length > (key === 'bio' ? 5000 : 500))) return fail('Profile text is invalid or too long.')
      clean[key] = typeof value === 'string' ? value.trim() || null : null
    }
  }
  return { updates: clean as VoyagerProfileUpdate, error: null }
}

/** MIME and binary signature must agree; extensions supplied by clients are ignored. */
export function validateAvatar(bytes: Uint8Array, mime: string): { extension: string; error: null } | { extension: null; error: string } {
  const fail = (error: string) => ({ extension: null, error })
  if (!bytes.length || bytes.length > AVATAR_MAX_BYTES) return fail('Choose an image up to 5 MB.')
  const matches = (offset: number, signature: number[]) => signature.every((value, index) => bytes[offset + index] === value)
  const ascii = (offset: number, text: string) => matches(offset, Array.from(text, char => char.charCodeAt(0)))
  const valid = mime === 'image/png' && bytes.length >= 33 && matches(0, [137,80,78,71,13,10,26,10]) && ascii(12, 'IHDR') ? 'png'
    : mime === 'image/jpeg' && bytes.length >= 4 && matches(0, [255,216,255]) && bytes[3] !== 0 && bytes[3] !== 255 ? 'jpg'
    : mime === 'image/gif' && bytes.length >= 13 && (ascii(0, 'GIF87a') || ascii(0, 'GIF89a')) ? 'gif'
    : mime === 'image/webp' && bytes.length >= 20 && ascii(0, 'RIFF') && ascii(8, 'WEBP') && (ascii(12, 'VP8 ') || ascii(12, 'VP8L') || ascii(12, 'VP8X')) ? 'webp' : null
  return valid ? { extension: valid, error: null } : fail('Choose a valid PNG, JPEG, GIF or WebP image. SVG is not supported.')
}
