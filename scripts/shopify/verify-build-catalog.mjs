// Vercel-only verification: sensitive Shopify credentials stay inside the existing trusted build.
// Default builds do not contact Shopify. No credentials or provider response bodies are printed.
const mode = process.env.SHOPIFY_CATALOG_VERIFY
if (mode) {
  if (!['draft', 'ready'].includes(mode) || process.env.VERCEL_ENV !== 'production') {
    throw new Error('Catalog verification requires a staged production build and a valid verification mode.')
  }
  process.argv = [process.execPath, 'check-membership-catalog.mjs', ...(mode === 'draft' ? ['--allow-draft'] : [])]
  await import('./check-membership-catalog.mjs')
}
