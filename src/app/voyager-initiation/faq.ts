import { initiationPriceLabel } from '@/lib/initiation-pricing'
import { ANTENNA } from '@/lib/antenna-copy'

export const INITIATION_FAQ_GROUPS = [
  { id: 'devices', title: 'Devices & functions', items: [
    { question: 'What is the Antenna?', answer: `A collectible emblem for your Console. ${ANTENNA.requirement} ${ANTENNA.initialExclusion} Images show design studies; final appearance and quantity may change.` },
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
    { question: 'When will my packs ship?', answer: 'Planned dispatches: Dec 2026–Mar 2027, one pack per month. These are estimates; check your records for actual progress.' },
    { question: 'Where do you ship?', answer: 'The contiguous 48 US states and Washington, DC. Shipping and taxes included.' },
    { question: 'How are refunds calculated?', answer: 'Unshipped packs are refundable: $19 per pack for Initial, $122 for Complete, or $230 for the upgrade.', detailsLink: '/terms/initiation' },
  ] },
] as const
