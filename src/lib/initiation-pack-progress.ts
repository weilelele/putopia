import type { InitiationSnapshot } from './initiation-types'

const shipmentLabels = {
  planned: 'Awaiting dispatch',
  preparing: 'Preparing',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  canceled: 'Canceled',
} as const

/** Display only: access still comes from the server's verified snapshot. */
export function initiationPackProgress(snapshot: InitiationSnapshot) {
  const complete = snapshot.status === 'initiated'
  const initial = snapshot.status === 'legacy_pack'
  const packs = [1, 2, 3, 4].map(position => {
    const shipment = snapshot.shipments.find(item => item.position === position)
    const canceled = shipment?.status === 'canceled'
    const included = !canceled && (complete || (initial && position <= 2))
    const paymentPaused = !included && !!shipment && shipment.status !== 'delivered' && ['refunded', 'disputed', 'payment_review'].includes(snapshot.paymentStatus)
    const awaitingActivation = initial && position > 2 && !shipment
    const claimable = complete && snapshot.consoleClaim.eligible && position === 3 && !snapshot.consoleClaim.claimed
      && (shipment?.status === 'planned' || shipment?.status === 'preparing')
    const label = canceled ? shipmentLabels.canceled
      : shipment?.status === 'delivered' ? shipmentLabels.delivered
      : paymentPaused ? 'Access paused'
      : awaitingActivation ? 'Awaiting activation'
      : !shipment ? 'Progress unavailable'
      : claimable && shipment.status === 'planned' ? 'Awaiting Console claim'
      : shipmentLabels[shipment.status]
    return { position, shipment, included, awaitingActivation, claimable, label }
  })
  const included = packs.filter(pack => pack.included)
  const delivered = included.filter(pack => pack.shipment?.status === 'delivered').length
  const pending = included.length > 0 && included.every(pack => !!pack.shipment) ? included.length - delivered : null
  return { packs, included: included.length, delivered, pending }
}
