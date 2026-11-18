import 'server-only'
import { shopifyLiveShop } from './shopify-checkout-url'

export function shopifyLiveConfig(env = process.env) {
  const clientId = env.SHOPIFY_LIVE_CLIENT_ID
  const clientSecret = env.SHOPIFY_LIVE_CLIENT_SECRET
  const privateToken = env.SHOPIFY_LIVE_STOREFRONT_TOKEN
  const publicToken = env.SHOPIFY_LIVE_STOREFRONT_PUBLIC_TOKEN
  const initial = env.SHOPIFY_LIVE_INITIAL_VARIANT_ID
  const standard = env.SHOPIFY_LIVE_COMPLETE_VARIANT_ID
  const membership = env.SHOPIFY_LIVE_MEMBERSHIP_VARIANT_ID
  const membershipInitial = env.SHOPIFY_LIVE_MEMBERSHIP_INITIAL_VARIANT_ID
  const membershipComplete = env.SHOPIFY_LIVE_MEMBERSHIP_COMPLETE_VARIANT_ID
  const upgrade = env.SHOPIFY_LIVE_UPGRADE_VARIANT_ID
  const variant = /^gid:\/\/shopify\/ProductVariant\/\d+$/
  if (env.VERCEL_ENV !== 'production' || !clientId || !clientSecret || (!privateToken && !publicToken) || !initial || !standard
    || !variant.test(initial) || !variant.test(standard) || initial === standard) return null
  const storefrontAuth: Record<string, string> = privateToken ? { 'Shopify-Storefront-Private-Token': privateToken }
    : { 'X-Shopify-Storefront-Access-Token': publicToken! }
  return { shop: shopifyLiveShop, clientId, clientSecret, storefrontAuth, initial, standard,
    membership, membershipInitial, membershipComplete, upgrade }
}
