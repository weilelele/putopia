// Vercel-only verification: sensitive Shopify credentials stay inside the existing trusted build.
// Default builds do not contact Shopify. No credentials or provider response bodies are printed.
const mode = process.env.SHOPIFY_CATALOG_VERIFY
if (mode) {
  if (!['shop', 'ready', 'checkout'].includes(mode) || process.env.VERCEL_ENV !== 'production') {
    throw new Error('Catalog verification requires a staged production build and a valid verification mode.')
  }
  process.argv = [process.execPath, 'check-membership-catalog.mjs', ...(mode === 'shop' ? ['--shop-only'] : [])]
  await import('./check-membership-catalog.mjs')
  if (mode === 'checkout') await import('./check-membership-carts.mjs')
}
