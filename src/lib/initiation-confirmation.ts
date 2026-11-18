import 'server-only'
import type { InitiationOrderKind } from './initiation-types'
import { initiationConfirmationEmail } from './initiation-email'
import { sendTrackedEmail } from './tracked-email'
import { accountState, activationLink } from './activation'
import { INITIATION_ACTIVATION_NEXT } from './initiation-email-checkout'

/** Both providers share the durable per-order receipt and account activation link. */
export async function sendInitiationConfirmation(order: { id: string; user_id: string; order_kind: InitiationOrderKind; amount: number; pricing_version?: string | null }, recipient: string | null) {
  if (!recipient) throw new Error('Initiation order has no buyer email')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://multiverseco.org'
  const activated = (await accountState(order.user_id)).activated
  const email = initiationConfirmationEmail(siteUrl, order.order_kind, order, activated ? null : activationLink(order.user_id, INITIATION_ACTIVATION_NEXT))
  const sent = await sendTrackedEmail({ eventKey: `initiation-confirmed:${order.id}`, userId: order.user_id, recipient, category: 'initiation_confirmation', ...email })
  if (sent.error) throw new Error(sent.error)
}
