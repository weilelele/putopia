import { initiationPriceLabel } from '@/lib/initiation-pricing'

export const INITIATION_FAQ_GROUPS = [
  { id: 'devices', title: 'Devices & functions', items: [
    {
      question: 'What is the Multiverse Console?',
      answer: 'The Multiverse Console is a physical piece of sci-fi hardware built for the Collective’s fieldwork. Use its dials to tune into parallel worlds and switch between observation angles. Send quantum energy into a world, or send your voice with it where supported. A transmission might bring a faint image into focus or change something on the other side. Share what you observe with fellow Voyagers and investigate the results together.',
      paragraphs: [
        'There’s still much to discover about what the Console can do. As a Voyager, you can help the Collective uncover new capabilities and find new ways to interact with parallel worlds.',
      ],
    },
    { question: 'What is the Antenna, and what does it do?', answer: 'Antenna for Multiverse Console. An emblem of the Collective. A connection to the unknown. It receives a particular category of parallel-world signals when installed on top of the Console. We are still learning what those signals contain. Explore them together.' },
    { question: 'Can I add a Console later?', answer: `Yes. Initial Pack members can add Console + Pack 4 for ${initiationPriceLabel('legacy_upgrade')}. Buying Complete upfront saves $10 compared with the current Initial + upgrade.` },
    {
      question: 'How do I claim a Console?',
      answer: 'If you purchased the Complete Voyager Pack or upgraded your Initial Voyager Pack with Console + Pack 4, go to the ',
      claimLink: '/devices',
      afterClaimLink: ' page and choose an available batch to claim your Console.',
    },
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

export const MEMBERSHIP_FAQ_GROUPS = [
  INITIATION_FAQ_GROUPS[0],
  { id: 'membership', title: 'Membership & payment', items: [
    {
      question: 'What does Voyager Membership include?',
      answer: 'All three options include Voyager access to Mission Briefings, Parallax Array observation submissions, Classified Intel and Member Votes. The $12 Membership includes no physical Packs or Console claim.',
      paragraphs: ['Initial Voyager Pack includes Packs 1–2. Complete Voyager Pack includes all four Packs, including the Multiverse Console.'],
    },
    {
      question: 'Can I take part in missions without a Console?',
      answer: 'Voyager members can open Mission Board details and read the full briefings. Accepting and carrying out missions requires a Multiverse Console bound to your account.',
    },
    {
      question: 'Does Membership count toward the 100 S26 seats?',
      answer: 'Yes. Voyager Membership uses one of the 100 S26 seats. Upgrading keeps your existing seat.',
    },
    {
      question: 'Can I upgrade later?',
      answer: 'Your $12 Membership payment is credited toward an upgrade. Pay $26 to add Initial Voyager Pack or $476 to go directly to Complete Voyager Pack.',
      paragraphs: ['Once you own Initial Voyager Pack, adding Console + Pack 4 costs $460. Initial plus that upgrade totals $498. Choosing Complete directly totals $488 and saves $10.'],
    },
    {
      question: 'When will my membership become active?',
      answer: 'Voyager access opens once your payment is confirmed. You can use your digital benefits while any physical Packs included in your purchase follow their dispatch schedule.',
    },
    { question: 'Is this a subscription?', answer: 'Each option is a one-time payment. There is no recurring membership fee.' },
  ] },
  { id: 'shipping', title: 'Shipping & refunds', items: [
    {
      ...INITIATION_FAQ_GROUPS[2].items[0],
      paragraphs: [
        'The $12 Membership has no physical deliveries. This schedule applies to the Packs included in your purchase or upgrade.',
        ...INITIATION_FAQ_GROUPS[2].items[0].paragraphs,
      ],
    },
    {
      question: 'Where do you ship?',
      answer: 'Physical Packs ship to the 48 contiguous US states and Washington, DC. Shipping and applicable taxes are included in the displayed Pack or upgrade total. The $12 Membership requires no delivery address.',
    },
    {
      question: 'What happens to my membership if I request a refund?',
      answer: 'Refunding only your upgrade payment keeps your original $12 Voyager Membership and S26 seat active.',
      paragraphs: [
        'Refunding the original $12 Membership payment cancels that Membership, closes its member access and releases its S26 seat.',
        'Unshipped Packs are eligible for cancellation refunds. Refunded or canceled Packs will not be dispatched.',
      ],
      detailsLink: '/terms/initiation#refunds',
    },
    {
      question: 'How are Pack refunds calculated?',
      answer: 'Each Pack payment is divided equally among the Packs purchased in that payment. A $26 Membership upgrade covers Packs 1–2 at $13 each. A $476 direct upgrade to Complete covers four Packs at $119 each. Your original $12 Membership payment is separate.',
      paragraphs: [
        'For a direct Initial purchase, the allocation is $19 per Pack. For a direct Complete purchase, it is $122 per Pack. The $460 Initial-to-Complete upgrade covers Console + Pack 4 at $230 each.',
        'Only unshipped Packs are eligible for cancellation refunds. Historical purchases retain their original refund terms.',
      ],
      detailsLink: '/terms/initiation#refunds',
    },
  ] },
] as const
