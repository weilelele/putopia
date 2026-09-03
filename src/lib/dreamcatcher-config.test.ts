import { describe, expect, it } from 'vitest'
import { EMPTY_DREAMCATCHER, dreamcatcherConfig, planDreamcatcherSave, validateDreamcatcherConfig } from './dreamcatcher-config'

const config = { slug: 'kyoto-02', code: 'DC-KYO-02', name: 'Kyoto Dreamcatcher', city: 'Kyoto', country: 'Japan', location: 'Kyoto, Japan', time_zone: 'Asia/Tokyo', round_duration_minutes: 8, queue_capacity: 50 }
const id = 'dd62c171-740b-4625-90a9-239338401a87'

describe('Dreamcatcher configuration', () => {
  it('starts with safe form defaults', () => {
    expect(EMPTY_DREAMCATCHER.round_duration_minutes).toBe(8)
    expect(EMPTY_DREAMCATCHER.queue_capacity).toBe(50)
    expect(validateDreamcatcherConfig(EMPTY_DREAMCATCHER)).not.toBeNull()
  })
  it('creates unpublished idle devices and strips injected runtime fields', () => {
    const plan = planDreamcatcherSave({ mode: 'create', config: { ...config, code: ' dc-kyo-02 ', name: ' Kyoto Dreamcatcher ', is_public: true, status: 'processing', id } })
    expect(plan).toEqual({ error: null, mode: 'create', values: { ...config, is_public: false, status: 'idle' } })
  })
  it('edits only whitelisted fields and compares the full original content', () => {
    const plan = planDreamcatcherSave({ mode: 'edit', id, expected: { ...config, updated_at: 'worker-clock', status: 'idle' }, config: { ...config, queue_capacity: 25, round_duration_minutes: 10, is_public: false } })
    expect(plan.error).toBeNull()
    if (plan.error !== null || plan.mode !== 'edit') throw new Error('Expected edit plan')
    expect(plan.id).toBe(id)
    expect(plan.expected).toEqual(config)
    expect(plan.values).toMatchObject({ queue_capacity: 25, round_duration_minutes: 10 })
    for (const key of ['slug', 'id', 'is_public', 'status', 'updated_at', 'jobs']) expect(plan.values).not.toHaveProperty(key)
  })
  it('allows reducing capacity without modifying queued jobs', () => {
    const plan = planDreamcatcherSave({ mode: 'edit', id, expected: config, config: { ...config, queue_capacity: 1 } })
    expect(plan.error).toBeNull()
  })
  it('keeps original field values intact for optimistic compare-and-update', () => {
    const expected = { ...config, name: 'Kyoto Dreamcatcher ' }
    const plan = planDreamcatcherSave({ mode: 'edit', id, expected, config })
    if (plan.error !== null || plan.mode !== 'edit') throw new Error('Expected edit plan')
    expect(plan.expected.name).toBe('Kyoto Dreamcatcher ')
  })
  it('protects the permanent slug', () => {
    expect(planDreamcatcherSave({ mode: 'edit', id, expected: config, config: { ...config, slug: 'other-device' } }).error).toContain('cannot be changed')
  })
  it.each([null, [], {}, { mode: 'delete', config }, { mode: 'create', config: null }, { mode: 'edit', id: 'bad-id', config, expected: config }, { mode: 'edit', id, config }])('rejects malformed save request %j', (input) => {
    expect(planDreamcatcherSave(input).error).toBeTruthy()
  })
  it.each([
    { name: '' }, { name: 'x'.repeat(161) }, { slug: '../kyoto' }, { slug: 'Kyoto' }, { slug: 'bad--slug' },
    { code: 'CODE 1' }, { city: null }, { country: [] }, { location: ' ' }, { time_zone: 'Moon/Sea' }, { time_zone: '+05:00' },
    { round_duration_minutes: 7 }, { round_duration_minutes: 11 }, { round_duration_minutes: 8.5 }, { round_duration_minutes: '8' },
    { queue_capacity: 0 }, { queue_capacity: 501 }, { queue_capacity: 1.2 }, { queue_capacity: NaN }, { queue_capacity: '50' },
  ])('rejects invalid fields %j', (fields) => {
    expect(validateDreamcatcherConfig({ ...config, ...fields })).toBeTruthy()
  })
  it.each(['UTC', 'Asia/Tokyo', 'Europe/London', 'America/Mexico_City'])('accepts time zone %s', (time_zone) => {
    expect(validateDreamcatcherConfig({ ...config, time_zone })).toBeNull()
  })
  it('does not leak publication or runtime fields into editor snapshots', () => {
    expect(dreamcatcherConfig({ ...config, ...{ is_public: true, status: 'processing' } })).toEqual(config)
  })
})
