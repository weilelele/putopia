import { initiationPriceLabel } from '@/lib/initiation-pricing'

export const INITIATION_FAQ_GROUPS = [
  { id: 'devices', title: 'Devices & functions', items: [
    {
      question: 'What is the Multiverse Console?',
      answer: 'The Multiverse Console is a physical piece of sci-fi hardware built for the Collective’s fieldwork. Use its dials to tune into parallel worlds and switch between observation angles. Send quantum energy into a world, or send your voice with it where supported. A transmission might bring a faint image into focus or change something on the other side. Share what you observe with fellow Voyagers and investigate the results together.',
    },
    { question: 'What is the Antenna, and what does it do?', answer: 'The Antenna is a collectible receiving accessory for the Multiverse Console. Installed on top of your Console, it receives a particular category of signals from parallel worlds. We are still exploring what those signals contain, together.' },
    { question: 'Can I add a Console later?', answer: `Yes. Initial Pack members can add Console + Pack 4 for ${initiationPriceLabel('legacy_upgrade')}. Buying Complete upfront saves $10 compared with the current Initial + upgrade.` },
    { question: 'How do I claim a Console?', answer: 'Complete and the upgrade include one Console. Choose an available batch on Devices. If full, choose another or wait; your entitlement remains.' },
    { question: 'Can I change my Console batch?', answer: 'Before shipment, subject to availability. Once shipped, the batch cannot be changed.' },
  ] },
  { id: 'membership', title: 'Membership & payment', items: [
    { question: 'What is the difference between the bundles?', answer: 'Both include Voyager membership and remote access to the Parallax Array. Initial includes Packs 1–2; Complete adds the Console and Pack 4.' },
    { question: 'Is this a subscription?', answer: 'No. Both bundles are a one-time payment.' },
    { question: 'When will my card be charged?', answer: 'We authorize your card at checkout and charge after verifying your delivery region. If unsupported, we cancel the authorization. A temporary bank hold may appear.' },
  ] },
  { id: 'shipping', title: 'Shipping & taxes', items: [
    {
      question: 'When will my packs ship?',
      answer: 'The S26 dispatch schedule is:',
      dispatches: [
        { label: 'Pack 1', month: 'October 2026' },
        { label: 'Pack 2', month: 'November 2026' },
        { label: 'Pack 3 · Multiverse Console', month: 'December 2026' },
        { label: 'Pack 4', month: 'January 2027' },
      ],
      paragraphs: [
        'If you purchase after a scheduled dispatch date, the earlier packs included in your bundle will be sent together. Your remaining packs will follow the schedule above.',
        'For example, buying Complete after the November dispatch means Packs 1–2 will be sent together, with the Console planned for December and Pack 4 for January.',
        'These are planned dispatch months, not guaranteed arrival dates. Tracking information will be available after dispatch.',
      ],
    },
    { question: 'Where do you ship?', answer: 'The contiguous 48 US states and Washington, DC. Shipping and taxes included.' },
    { question: 'How are refunds calculated?', answer: 'Unshipped packs are refundable: $19 per pack for Initial, $122 for Complete, or $230 for the upgrade.', detailsLink: '/terms/initiation' },
  ] },
] as const
