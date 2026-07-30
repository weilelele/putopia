export type BatchDecisionOption = {
  detail: string
  id: string
  label: string
  votes: number
}

export type BatchDecision = {
  closesAt: string
  id: string
  options: BatchDecisionOption[]
  summary: string
  title: string
}

export type OwnedBatchRecord = {
  claimedAt: string
  orderCode: string
  slug: string
  unit: string
}

const DECISIONS: Partial<Record<string, BatchDecision>> = {
  'cairo-batch-01': {
    closesAt: 'Aug 08, 2026',
    id: 'receiver-pairing',
    options: [
      {
        detail: 'Each Console keeps the receiver pattern found with its original chassis.',
        id: 'preserve',
        label: 'Preserve original pairings',
        votes: 31,
      },
      {
        detail: 'Receiver assemblies are regrouped to make calibration more consistent.',
        id: 'standardize',
        label: 'Standardize by receiver family',
        votes: 11,
      },
    ],
    summary:
      'The recovery team needs holder direction before receiver assemblies are assigned to the final Consoles.',
    title: 'How should receiver differences be handled?',
  },
  'kyoto-relay-02': {
    closesAt: 'Aug 03, 2026',
    id: 'dispatch-window',
    options: [
      {
        detail: 'Completed assemblies leave first; the remaining seven follow after calibration.',
        id: 'split',
        label: 'Use two dispatch windows',
        votes: 9,
      },
      {
        detail: 'All thirty-one assemblies leave together after the final unit passes.',
        id: 'together',
        label: 'Keep one shared dispatch',
        votes: 22,
      },
    ],
    summary:
      'Twenty-four assemblies are ready. Holders can decide whether the group waits for all thirty-one.',
    title: 'Should the tuning assemblies travel together?',
  },
  'berlin-origin-01': {
    closesAt: 'Sep 01, 2026',
    id: 'quarterly-record',
    options: [
      {
        detail: 'Compare return-signal images from all active regions.',
        id: 'signals',
        label: 'Return-signal comparison',
        votes: 12,
      },
      {
        detail: 'Document how holders have incorporated the Console into their spaces.',
        id: 'installations',
        label: 'Field installation record',
        votes: 6,
      },
    ],
    summary: 'The active holder group chooses the focus of the next shared field record.',
    title: 'What should the next field record document?',
  },
}

export const OWNED_BATCH_RECORDS: OwnedBatchRecord[] = [
  {
    claimedAt: 'Feb 11, 2026',
    orderCode: 'MC-KYO-0019',
    slug: 'kyoto-relay-02',
    unit: 'KR-02-019',
  },
  {
    claimedAt: 'Jul 18, 2026',
    orderCode: 'MC-CAI-0042',
    slug: 'cairo-batch-01',
    unit: 'ASSIGNMENT PENDING',
  },
]

export function getBatchDecision(slug: string) {
  return DECISIONS[slug]
}
