import type { DeviceBatch } from './device-batches'

export type LocalBatchSeed = {
  code: string
  leadName: string
  location: string
  name: string
  slug: string
  summary: string
  updatedAt: string
}

export function toBatchSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function validateLocalBatchSeed(seed: LocalBatchSeed) {
  const errors: string[] = []

  if (
    seed.code.trim().length === 0 ||
    seed.leadName.trim().length === 0 ||
    seed.location.trim().length === 0 ||
    seed.name.trim().length === 0 ||
    seed.summary.trim().length === 0 ||
    seed.updatedAt.trim().length === 0
  ) {
    errors.push('Complete every Batch identity field.')
  }
  if (seed.slug !== toBatchSlug(seed.slug) || seed.slug.length < 3) {
    errors.push('Slug must use at least three lowercase letters, numbers, or hyphens.')
  }

  return errors
}

export function normalizeLocalBatchSeed(seed: LocalBatchSeed): LocalBatchSeed {
  return {
    code: seed.code.trim().toUpperCase(),
    leadName: seed.leadName.trim(),
    location: seed.location.trim(),
    name: seed.name.trim(),
    slug: toBatchSlug(seed.slug),
    summary: seed.summary.trim(),
    updatedAt: seed.updatedAt.trim(),
  }
}

export function createDeviceBatchFromSeed(seed: LocalBatchSeed): DeviceBatch {
  const normalized = normalizeLocalBatchSeed(seed)
  const initials =
    normalized.leadName
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'FL'

  return {
    archiveStages: [],
    code: normalized.code,
    distributionStages: [
      {
        contents: ['Multiverse Console'],
        id: 'console',
        label: 'Multiverse Console',
        status: 'upcoming',
        summary: 'Final Console delivery plan pending.',
        window: 'Window pending',
      },
    ],
    estimatedCompletion: 'Estimate pending',
    facts: [
      { label: 'FIRST RECORD', value: normalized.updatedAt },
      { label: 'LOCATION', value: normalized.location },
    ],
    holders: [],
    image: '/assets/device-console.jpg',
    imageAlt: `${normalized.name} Batch draft`,
    imageFit: 'contain',
    latestUpdate: {
      body: normalized.summary,
      date: normalized.updatedAt,
      title: 'Initial field record',
    },
    lead: {
      bio: `${normalized.leadName} is preparing the first field record for this Batch.`,
      initials,
      latestNote: 'Initial field record pending.',
      location: normalized.location,
      name: normalized.leadName,
      role: 'Field Lead',
    },
    location: normalized.location,
    name: normalized.name,
    nextMilestone: 'Publish first field report',
    slug: normalized.slug,
    status: 'survey',
    statusLine: 'Initial field record pending',
    summary: normalized.summary,
    updatedAt: normalized.updatedAt,
    heroCaption: 'Primary Batch image pending.',
  }
}
