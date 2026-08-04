import { createHash } from 'node:crypto'

export const CAMPAIGN_ROLES = ['applicant', 'voyager', 'architect'] as const
export type CampaignRole = (typeof CAMPAIGN_ROLES)[number]

export type CampaignAudience =
  | { type: 'all' }
  | { type: 'roles'; roles: CampaignRole[] }
  | { type: 'users'; userIds: string[] }

export interface PushCampaignSpec {
  campaignKey: string
  audience: CampaignAudience
  title: string
  body: string
  route: string
  variables?: Record<string, string | number | boolean>
}
export interface PushCampaignProfile {
  id: string
  display_name: string
  role: CampaignRole
  location: string | null
  batch_label: string | null
}

export interface RenderedPushCampaign {
  userId: string
  displayName: string
  title: string
  body: string
  route: string
}

const CAMPAIGN_KEY = /^[a-z0-9][a-z0-9_-]{2,63}$/
const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VARIABLE_KEY = /^[a-z][a-z0-9_]{0,39}$/
const PLACEHOLDER = /{{\s*([a-z][a-z0-9_]*)\s*}}/gi
const BUILT_INS = new Set(['display_name', 'first_name', 'role', 'location', 'batch_label', 'user_id'])

function objectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeAudience(value: unknown): CampaignAudience {
  if (!objectRecord(value)) throw new Error('audience must be an object')
  if (value.type === 'all') return { type: 'all' }
  if (value.type === 'roles') {
    if (!Array.isArray(value.roles) || value.roles.length === 0) {
      throw new Error('roles audience requires at least one role')
    }
    const roles = [...new Set(value.roles)]
    if (roles.some((role) => !CAMPAIGN_ROLES.includes(role as CampaignRole))) {
      throw new Error('roles audience contains an unsupported role')
    }
    return { type: 'roles', roles: roles as CampaignRole[] }
  }
  if (value.type === 'users') {
    if (!Array.isArray(value.userIds) || value.userIds.length === 0 || value.userIds.length > 500) {
      throw new Error('users audience requires between 1 and 500 userIds')
    }
    const userIds = [...new Set(value.userIds)]
    if (userIds.some((id) => typeof id !== 'string' || !USER_ID.test(id))) {
      throw new Error('users audience contains an invalid userId')
    }
    return { type: 'users', userIds }
  }
  throw new Error('audience type must be all, roles, or users')
}

export function parseCampaignSpec(value: unknown): PushCampaignSpec {
  if (!objectRecord(value)) throw new Error('campaign spec must be an object')
  const campaignKey = typeof value.campaignKey === 'string' ? value.campaignKey.trim() : ''
  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const body = typeof value.body === 'string' ? value.body.trim() : ''
  const route = typeof value.route === 'string' ? value.route.trim() : ''

  if (!CAMPAIGN_KEY.test(campaignKey)) {
    throw new Error('campaignKey must be 3-64 lowercase letters, numbers, dashes, or underscores')
  }
  if (!title || title.length > 180) throw new Error('title template must be 1-180 characters')
  if (!body || body.length > 420) throw new Error('body template must be 1-420 characters')
  if (!route || route.length > 300) throw new Error('route template must be 1-300 characters')

  const variables: Record<string, string | number | boolean> = {}
  if (value.variables !== undefined) {
    if (!objectRecord(value.variables)) throw new Error('variables must be an object')
    const entries = Object.entries(value.variables)
    if (entries.length > 30) throw new Error('variables supports at most 30 values')
    for (const [key, variableValue] of entries) {
      if (!VARIABLE_KEY.test(key) || BUILT_INS.has(key)) throw new Error(`invalid variable name: ${key}`)
      if (!['string', 'number', 'boolean'].includes(typeof variableValue)) {
        throw new Error(`variable ${key} must be a string, number, or boolean`)
      }
      if (String(variableValue).length > 200) throw new Error(`variable ${key} is too long`)
      variables[key] = variableValue as string | number | boolean
    }
  }

  const spec = { campaignKey, audience: normalizeAudience(value.audience), title, body, route, variables }
  validatePlaceholders(spec)
  return spec
}

function placeholderNames(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map((match) => match[1].toLowerCase())
}

function validatePlaceholders(spec: PushCampaignSpec) {
  const allowed = new Set([...BUILT_INS, ...Object.keys(spec.variables ?? {})])
  for (const name of [
    ...placeholderNames(spec.title),
    ...placeholderNames(spec.body),
    ...placeholderNames(spec.route),
  ]) {
    if (!allowed.has(name)) throw new Error(`unknown template variable: ${name}`)
  }
}

function render(template: string, variables: Record<string, string>): string {
  return template.replace(PLACEHOLDER, (_, name: string) => variables[name.toLowerCase()] ?? '')
}

export function renderCampaignForProfile(
  spec: PushCampaignSpec,
  profile: PushCampaignProfile,
): RenderedPushCampaign {
  const firstName = profile.display_name.trim().split(/\s+/)[0] || 'Voyager'
  const variables: Record<string, string> = {
    display_name: profile.display_name || 'Voyager',
    first_name: firstName,
    role: profile.role,
    location: profile.location ?? '',
    batch_label: profile.batch_label ?? '',
    user_id: profile.id,
    ...Object.fromEntries(Object.entries(spec.variables ?? {}).map(([key, value]) => [key, String(value)])),
  }
  const title = render(spec.title, variables).trim()
  const body = render(spec.body, variables).trim()
  const route = render(spec.route, variables).trim()

  if (!title || title.length > 100) throw new Error(`rendered title is invalid for ${profile.id}`)
  if (!body || body.length > 240) throw new Error(`rendered body is invalid for ${profile.id}`)
  if (!route.startsWith('/') || route.startsWith('//') || route.length > 300) {
    throw new Error(`rendered route is invalid for ${profile.id}`)
  }
  return { userId: profile.id, displayName: profile.display_name, title, body, route }
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (objectRecord(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
  }
  return value
}

export function campaignSpecHash(spec: PushCampaignSpec): string {
  return createHash('sha256').update(JSON.stringify(stable(spec))).digest('hex')
}
