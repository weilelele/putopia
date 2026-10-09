// Only repairs tax behavior on the two reviewed live prices. No payments or sessions.
// Supply an existing live credential via STRIPE_SECRET_KEY; never pass it as an argument.
// Default is read-only. Add --apply after reviewing the audit output.
import Stripe from 'stripe'

const accountId = 'acct_1TeNZZA6e1upDxOq'
const productId = 'prod_VPModfWvLA6dtp'
const expected = [
  ['price_1UOY53A6e1upDxOqEJT1FHCQ', 52000],
  ['price_1UOY53A6e1upDxOqAdHsB3kN', 40000],
]

async function main() {
  if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Only --apply is supported')
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || !/^(sk|rk)_live_/.test(key)) throw new Error('An existing live STRIPE_SECRET_KEY is required')
  const stripe = new Stripe(key, { maxNetworkRetries: 1, timeout: 15000 })
  if ((await stripe.accounts.retrieve()).id !== accountId) throw new Error('Stripe account mismatch')
  const prices = await Promise.all(expected.map(async ([id, amount]) => {
    const price = await stripe.prices.retrieve(id)
    if (!price.livemode || !price.active || price.product !== productId || price.currency !== 'usd' || price.type !== 'one_time' || price.unit_amount !== amount) throw new Error(`Offer mismatch: ${id}`)
    if (!['unspecified', 'inclusive'].includes(price.tax_behavior)) throw new Error(`Cannot repair existing exclusive price: ${id}`)
    return price
  }))
  // Validate both offers before changing either; safe to retry after partial failure.
  for (const price of prices) {
    if (process.argv.includes('--apply') && price.tax_behavior === 'unspecified') {
      await stripe.prices.update(price.id, { tax_behavior: 'inclusive' }, { idempotencyKey: `initiation-inclusive-repair:${price.id}` })
    }
    const verified = await stripe.prices.retrieve(price.id)
    console.log(JSON.stringify({ id: verified.id, amount: verified.unit_amount, currency: verified.currency, live: verified.livemode, taxBehavior: verified.tax_behavior }))
    if (process.argv.includes('--apply') && verified.tax_behavior !== 'inclusive') throw new Error('Tax behavior verification failed')
  }
}

main().catch(error => {
  // Do not print full provider errors, request headers or credentials.
  console.error(error instanceof Stripe.errors.StripeError ? `Stripe request failed (${error.type}, ${error.statusCode ?? 'unknown status'}, ${error.code ?? 'no code'})` : error.message)
  process.exitCode = 1
})
