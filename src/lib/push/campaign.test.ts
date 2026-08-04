import { describe, expect, it } from 'vitest'
import { campaignSpecHash, parseCampaignSpec, renderCampaignForProfile } from './campaign'

const profile = {
  id: '11111111-1111-4111-8111-111111111111',
  display_name: 'Sam Voyager',
  role: 'voyager' as const,
  location: 'Berkeley',
  batch_label: 'Cairo Batch 01',
}

const raw = {
  campaignKey: 'signal_august_2026',
  audience: { type: 'roles', roles: ['voyager'] },
  title: '{{first_name}}, a signal is waiting',
  body: '{{world_name}} has a transmission for {{display_name}}.',
  route: '/worlds/{{world_id}}',
  variables: { world_name: 'Parallel Paris', world_id: 'world-42' },
}

describe('push campaign spec', () => {
  it('renders personalized copy and deep link', () => {
    const rendered = renderCampaignForProfile(parseCampaignSpec(raw), profile)
    expect(rendered).toMatchObject({
      title: 'Sam, a signal is waiting',
      body: 'Parallel Paris has a transmission for Sam Voyager.',
      route: '/worlds/world-42',
    })
  })

  it('rejects unknown template variables', () => {
    expect(() => parseCampaignSpec({ ...raw, body: 'Hello {{email}}' }))
      .toThrow('unknown template variable: email')
  })

  it('rejects unsafe rendered routes', () => {
    const spec = parseCampaignSpec({
      ...raw,
      route: '{{destination}}',
      variables: { ...raw.variables, destination: 'https://evil.example' },
    })
    expect(() => renderCampaignForProfile(spec, profile)).toThrow('rendered route is invalid')
  })

  it('rejects oversized rendered notification copy', () => {
    const spec = parseCampaignSpec({ ...raw, body: '{{copy}}', variables: { ...raw.variables, copy: 'x'.repeat(200) } })
    expect(() => renderCampaignForProfile(spec, profile)).not.toThrow()
    const longName = { ...profile, display_name: 'x'.repeat(100) }
    const personalized = parseCampaignSpec({ ...raw, title: 'Signal', body: '{{display_name}}{{display_name}}{{display_name}}' })
    expect(() => renderCampaignForProfile(personalized, longName)).toThrow('rendered body is invalid')
  })

  it('produces the same hash regardless of variable key order', () => {
    const first = parseCampaignSpec(raw)
    const second = parseCampaignSpec({ ...raw, variables: { world_id: 'world-42', world_name: 'Parallel Paris' } })
    expect(campaignSpecHash(first)).toBe(campaignSpecHash(second))
  })

  it('deduplicates explicit users and enforces UUIDs', () => {
    const id = '22222222-2222-4222-8222-222222222222'
    const spec = parseCampaignSpec({ ...raw, audience: { type: 'users', userIds: [id, id] } })
    expect(spec.audience).toEqual({ type: 'users', userIds: [id] })
    expect(() => parseCampaignSpec({ ...raw, audience: { type: 'users', userIds: ['nope'] } }))
      .toThrow('invalid userId')
  })
})
