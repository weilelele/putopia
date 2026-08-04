import type { DeviceBatch } from './device-batches'

export type DiscussionPost = {
  author: string
  body: string
  id: string
  imageLabel?: string
  imageSources?: string[]
  initials: string
  replyCount: number
  role: string
  timestamp: string
}

export function getBatchDiscussionPosts(batch: DeviceBatch): DiscussionPost[] {
  const firstHolder = batch.holders[0]
  const holderName = firstHolder?.name ?? 'Signal Desk'
  const holderInitials = firstHolder
    ? firstHolder.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
    : 'SD'

  return [
    {
      author: batch.lead.name,
      body: batch.lead.latestNote,
      id: 'lead-field-update',
      imageLabel: '3 field images',
      imageSources: [batch.image, '/assets/device-desk.png', '/assets/device.png'],
      initials: batch.lead.initials,
      replyCount: 12,
      role: 'FIELD LEAD',
      timestamp: batch.updatedAt,
    },
    {
      author: holderName,
      body:
        batch.status === 'survey'
          ? 'Following this signal from the first report. Is the northern conduit part of the same array?'
          : 'The package record arrived intact. I have added the markings from my received component for comparison.',
      id: 'member-received-object',
      imageLabel: batch.status === 'survey' ? undefined : '1 received-object image',
      imageSources: batch.status === 'survey' ? undefined : ['/assets/device-desk.png'],
      initials: holderInitials,
      replyCount: 7,
      role: firstHolder ? 'HOLDER' : 'MEMBER',
      timestamp: '2 days ago',
    },
    {
      author: 'Archive Office',
      body:
        'The next holder vote will decide whether the recovered antenna variations remain paired with their original chassis.',
      id: 'archive-vote-notice',
      initials: 'AO',
      replyCount: 4,
      role: 'COLLECTIVE',
      timestamp: '4 days ago',
    },
    {
      author: 'Signal Desk',
      body: 'Power-test footage has been indexed. Two short reels are now available in the latest field update.',
      id: 'signal-desk-reel',
      initials: 'SD',
      replyCount: 2,
      role: 'FIELD DESK',
      timestamp: '6 days ago',
    },
  ]
}
