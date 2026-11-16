export const shopifyLiveShop = 'jtuuus-k3.myshopify.com'

export function shopifyLiveCheckoutUrl(raw: string) {
  const url = URL.parse(raw)
  return url && url.protocol === 'https:' && url.host === shopifyLiveShop
    && !url.username && !url.password && /^\/checkouts\//.test(url.pathname) ? url : null
}
