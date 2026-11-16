import 'server-only'
import { shopifyLiveShop } from './shopify-checkout-url'

export function shopifyLiveConfig(env = process.env) {
  const clientId = env.SHOPIFY_LIVE_CLIENT_ID
  const clientSecret = env.SHOPIFY_LIVE_CLIENT_SECRET
  const storefrontToken = env.SHOPIFY_LIVE_STOREFRONT_TOKEN
  const initial = env.SHOPIFY_LIVE_INITIAL_VARIANT_ID
  const standard = env.SHOPIFY_LIVE_COMPLETE_VARIANT_ID
  const variant = /^gid:\/\/shopify\/ProductVariant\/\d+$/
  if (env.VERCEL_ENV !== 'production' || !clientId || !clientSecret || !storefrontToken || !initial || !standard
    || !variant.test(initial) || !variant.test(standard) || initial === standard) return null
  return { shop: shopifyLiveShop, clientId, clientSecret, storefrontToken, initial, standard }
}
