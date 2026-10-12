import type { DeviceBatch } from './device-batches'

/** Current public copy is separate from historical order and fulfillment terms. */
export function deviceBatchIntroduction(batch: Pick<DeviceBatch, 'name' | 'location'>) {
  return `${batch.name} is part of the collective’s equipment programme in ${batch.location}. Follow this batch’s field records, preparation and member allocations here. Claim eligibility is checked against your individual membership entitlement.`
}

export function deviceBatchMilestone(batch: Pick<DeviceBatch, 'status'>) {
  return batch.status === 'searching'
    ? 'Verify equipment and publish the next field update.'
    : 'Publish the next equipment preparation and allocation update.'
}

export const DEVICE_MEMBERSHIP_FAQ = [
  { question: 'How do I claim a Console?', answer: 'Use Claim on the Device page. With a verified Console entitlement, allocation is checked against actual device capacity. Without an entitlement, a confirmation explains Voyager Initiation before you choose to continue. A Voyager or Architect role or earlier Initial Pack alone does not confirm eligibility. Existing claims remain in My Consoles.' },
  { question: 'Is this a device shop?', answer: 'These pages document the collective’s equipment. New Console claims belong to the Voyager Initiation membership flow; there is no separate per-device checkout here.' },
  { question: 'Does S26 mean 100 available devices?', answer: 'No. S26 has 100 membership seats. Equipment batch quantities, available units and individual allocations are tracked separately. A membership seat is not a device serial number.' },
  { question: 'When will my packages arrive?', answer: 'Initiation includes four planned dispatches in October, November and December 2026, and January 2027. View your personal shipment status and available tracking in Initiation. Planned dispatch months are not guaranteed delivery dates.' },
  { question: 'What happens to my earlier order?', answer: 'Earlier Console orders and Initial Pack orders keep their own fulfillment records and agreed terms. View Console orders in My Consoles and Initial Pack progress in Initiation. An earlier order or member role does not automatically grant the new four-package entitlement.' },
  { question: 'Are the gallery images my assigned unit?', answer: 'The gallery documents device designs and settings, including visualizations. It does not confirm an individual unit’s condition, serial number or allocation. Check your own Console record for assigned equipment.' },
  { question: 'Where can I check delivery details or get help?', answer: 'Use your personal shipment and order records for delivery details. For an existing order, damaged, incorrect or missing items, contact voyagers@multiverseco.org with your order number. New claim availability and applicable delivery terms are shown in the membership flow.' },
]
