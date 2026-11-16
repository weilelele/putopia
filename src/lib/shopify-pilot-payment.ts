import 'server-only'
import { INITIAL_PILOT_QUERY, readPilotOrder } from '../../scripts/shopify/initial-pilot-order.mjs'
import { pilotCheckoutAttribute, shopifyApiVersion, shopifyPilotRequest, type ShopifyPilotOffer } from './shopify-bundle-pilot'
import { createAdminClient } from './supabase/server'

type GraphQLResult<T> = { data?: T; errors?: { message: string }[] }
type OrderMatch = { id: string; email: string | null; createdAt: string; test: boolean; displayFinancialStatus: string; customAttributes: { key: string; value: string }[] }

export async function readShopifyPilotPayment(config: ShopifyPilotOffer, { reference, createdAt, email, requireEmail = false }: {
  reference: string
  createdAt: string
  email: string
  requireEmail?: boolean
}) {
  const base = `https://${config.shop}`
  const token = await shopifyPilotRequest<{ access_token?: string }>(`${base}/admin/oauth/access_token`, {}, new URLSearchParams({
    grant_type: 'client_credentials', client_id: config.clientId, client_secret: config.clientSecret,
  }))
  if (!token.access_token) throw new Error('Missing Shopify access token')
  const query = <T,>(document: string, variables: Record<string, string | boolean>) => shopifyPilotRequest<GraphQLResult<T>>(
    `${base}/admin/api/${shopifyApiVersion}/graphql.json`,
    { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token.access_token! },
    JSON.stringify({ query: document, variables }),
  )
  const matches = await query<{ orders: { nodes: OrderMatch[]; pageInfo: { hasNextPage: boolean } } }>(`
    query BundlePilotOrders($search: String!) {
      orders(first: 50, query: $search, sortKey: CREATED_AT, reverse: true) {
        nodes { id email createdAt test displayFinancialStatus customAttributes { key value } }
        pageInfo { hasNextPage }
      }
    }
  `, { search: `test:true created_at:>=${JSON.stringify(createdAt)}${config.draftUrl ? ` email:${email}` : ''}` })
  if (matches.errors?.length || !matches.data?.orders) throw new Error('Could not read Shopify orders')
  const { nodes, pageInfo } = matches.data.orders
  const orders = nodes.filter(order => order.test && Date.parse(order.createdAt) >= Date.parse(createdAt)
    && (config.draftUrl ? order.email?.toLowerCase() === email
      : order.customAttributes.some(attr => attr.key === pilotCheckoutAttribute && attr.value === reference)))
  if (pageInfo.hasNextPage || orders.length > 1) throw new Error('This test checkout needs an order review.')
  const [order] = orders
  if (!order || !['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(order.displayFinancialStatus)) return null

  const result = await query<{ order: Parameters<typeof readPilotOrder>[0] }>(INITIAL_PILOT_QUERY, { id: order.id, isComplete: config.kind === 'standard' })
  if (result.errors?.length || !result.data?.order) throw new Error('Could not verify Shopify order')
  const snapshot = readPilotOrder(result.data.order, { orderId: order.id, email, kind: config.kind, bundle: {
    ...(config.draftUrl ? {} : { checkout: { key: pilotCheckoutAttribute, reference: reference } }),
    variantId: config.variantId,
  } })
  if (requireEmail && order.email?.trim().toLowerCase() !== email) throw new Error('Shopify order email does not match the guest checkout')
  return { id: order.id, ...snapshot }
}

export async function syncShopifyPilotPayment(config: ShopifyPilotOffer, user: { id: string }, snapshot: NonNullable<Awaited<ReturnType<typeof readShopifyPilotPayment>>>) {
  const admin = createAdminClient()
  // Test-only RPC from schema_v118, intentionally absent from production types.
  const { error } = await admin.rpc('sync_shopify_bundle_pilot' as never, {
    p_shop: config.shop, p_shopify_order: snapshot.id, p_user: user.id,
    p_paid_at: snapshot.paidAt, p_updated_at: snapshot.updatedAt, p_refunded_packs: snapshot.refundedPacks,
    p_packs: snapshot.packs, p_kind: config.kind, p_shipping: snapshot.shipping ?? null,
  } as never)
  if (error) throw new Error(error.message)
}
