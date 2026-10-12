import { describe, expect, it } from 'vitest'
import { AVATAR_MAX_BYTES, validateAvatar, validateProfileUpdate } from './profile-validation'
describe('profile runtime authorization', () => {
  it('allows applicants to change a trimmed name', () => expect(validateProfileUpdate({ display_name: '  Nova  ' }, 'applicant')).toEqual({ updates: { display_name: 'Nova' }, error: null }))
  it.each(['role', 'batch_label', 'member_no', 'id', 'avatar_url', 'task_quiz_at', 'experiment_group', '__proto__'])('rejects injected %s even for architects', field => expect(validateProfileUpdate({ [field]: 'value' }, 'architect').error).toBeTruthy())
  it.each(['bio', 'location', 'social_x', 'observation_days'])('restricts applicant field %s', field => expect(validateProfileUpdate({ [field]: 'value' }, 'applicant').error).toBeTruthy())
  it.each(['', ' '.repeat(5), 'x'.repeat(61), 'a\nb'])('rejects invalid name', display_name => expect(validateProfileUpdate({ display_name }, 'voyager').error).toBeTruthy())
  it('preserves member editor fields and rejects malformed values', () => {
    expect(validateProfileUpdate({ bio: null, location: ' Tokyo ', observation_days: 4, worlds_discovered: 0 }, 'voyager').error).toBeNull()
    expect(validateProfileUpdate({ observation_days: -1 }, 'voyager').error).toBeTruthy()
    expect(validateProfileUpdate({ bio: {} }, 'voyager').error).toBeTruthy()
    expect(validateProfileUpdate(null, 'applicant').error).toBeTruthy()
    expect(validateProfileUpdate({ display_name: 'Name' }, 'guest').error).toBeTruthy()
  })
})
describe('avatar validation', () => {
  const png = new Uint8Array(33)
  png.set([137,80,78,71,13,10,26,10]); png.set([73,72,68,82],12)
  it('matches PNG MIME with actual signature', () => {
    expect(validateAvatar(png, 'image/png').extension).toBe('png')
    expect(validateAvatar(png, 'image/jpeg').error).toBeTruthy()
  })
  it('accepts supported raster signatures', () => {
    expect(validateAvatar(new Uint8Array([255,216,255,224]), 'image/jpeg').extension).toBe('jpg')
    const gif = new Uint8Array(13); gif.set(new TextEncoder().encode('GIF89a'))
    expect(validateAvatar(gif, 'image/gif').extension).toBe('gif')
    const webp = new Uint8Array(20); webp.set(new TextEncoder().encode('RIFF')); webp.set(new TextEncoder().encode('WEBPVP8X'),8)
    expect(validateAvatar(webp, 'image/webp').extension).toBe('webp')
  })
  it('rejects SVG, disguised HTML, empty, truncated and oversized files', () => {
    expect(validateAvatar(new TextEncoder().encode('<svg></svg>'), 'image/svg+xml').error).toBeTruthy()
    expect(validateAvatar(new TextEncoder().encode('<html>fake image</html>'), 'image/png').error).toBeTruthy()
    expect(validateAvatar(new Uint8Array(), 'image/png').error).toBeTruthy()
    expect(validateAvatar(png.slice(0, 12), 'image/png').error).toBeTruthy()
    expect(validateAvatar(new Uint8Array(AVATAR_MAX_BYTES + 1), 'image/png').error).toBeTruthy()
  })
})
