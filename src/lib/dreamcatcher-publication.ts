import type { DreamcatcherConfig } from '@/lib/dreamcatcher-config'

export type DreamcatcherPublicationInput = {
  id: string
  isPublic: boolean
  expectedIsPublic: boolean
}

export function isPublicationInput(value: unknown): value is DreamcatcherPublicationInput {
  if (!value || typeof value !== 'object') return false
  const input = value as Record<string, unknown>
  return typeof input.id === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)
    && typeof input.isPublic === 'boolean'
    && typeof input.expectedIsPublic === 'boolean'
    && input.isPublic !== input.expectedIsPublic
}

export type DreamcatcherPublicationRecord = DreamcatcherConfig & {
  id: string
  status: string
  is_public: boolean
}

export function publicDreamcatchers<T extends { is_public: boolean }>(rows: T[]): T[] {
  return rows.filter((row) => row.is_public === true)
}
