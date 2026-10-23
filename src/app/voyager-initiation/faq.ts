import { initiationPriceLabel } from '@/lib/initiation-pricing'
import { ANTENNA } from '@/lib/antenna-copy'

export const INITIATION_FAQ = [
  { question: 'Is this a subscription?', answer: 'No. Both bundles are a one-time payment.' },
  { question: 'When will my card be charged?', answer: 'We authorize your card at checkout and charge after verifying your delivery region. If unsupported, we cancel the authorization. A temporary bank hold may appear.' },
  { question: 'What is the difference between the bundles?', answer: 'Both include Voyager membership. Initial includes Packs 1–2; Complete includes all four, including the Console.' },
  { question: 'What is the Antenna?', answer: `${ANTENNA.firstMention}. ${ANTENNA.description} ${ANTENNA.requirement} ${ANTENNA.initialExclusion} The image shows design studies; final appearance and quantity are to be confirmed.` },
  { question: 'Can I add a Console later?', answer: `Yes. Add Console + Pack 4 for ${initiationPriceLabel('legacy_upgrade')}, including if you bought the original $12 Initial Pack. Buying Complete upfront saves $10 compared with the current Initial + upgrade.` },
  { question: 'How do I claim a Console?', answer: 'Complete and the upgrade include one Console. Choose an available batch on Devices. If full, choose another or wait; your entitlement remains.' },
  { question: 'Can I change my Console batch?', answer: 'Before shipment, subject to availability. Once shipped, the batch cannot be changed.' },
  { question: 'When will my packs ship?', answer: 'Planned dispatches: Oct 2026–Jan 2027, one pack per month. These are estimates; check your records for actual progress.' },
  { question: 'Where do you ship?', answer: 'The contiguous 48 US states and Washington, DC. Shipping and taxes included.' },
  { question: 'I already bought the $12 Initial Pack. What changes?', answer: `Your original payment and Packs 1–2 remain unchanged. Add Console + Pack 4 for ${initiationPriceLabel('legacy_upgrade')}. Completed upgrades keep their original price.` },
  { question: 'How are refunds calculated?', answer: 'Unshipped packs are refundable: $19 per pack for Initial, $122 for Complete, or $230 for the upgrade.', detailsLink: '/terms/initiation' },
] as const
