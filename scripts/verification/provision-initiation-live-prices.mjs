// Explicit live catalog provisioning only: no customers, checkout, charges, subscriptions or secret output.
// Run in the trusted Vercel build environment; do not pull production credentials onto this machine.
import Stripe from 'stripe';
import { INITIATION_PRICES, INITIATION_PRICING_VERSION } from '../../src/lib/initiation-pricing.ts';
if (process.argv[2] !== '--live' || !/^prod_/.test(process.argv[3] ?? '')) throw new Error('Requires --live and the existing dedicated product ID');
const key=process.env.STRIPE_SECRET_KEY;
if (!key?.startsWith('sk_live_')) throw new Error('Live-mode Stripe credential is required; no changes made');
const stripe=new Stripe(key,{maxNetworkRetries:1,timeout:15000});
const product=await stripe.products.retrieve(process.argv[3]);
// The existing production product has no metadata; verify its actual catalog identity.
if(product.deleted||!product.active||!product.livemode||product.name!=='Voyager Initiation') throw new Error('Dedicated live Initiation product mismatch');
const prices={};
for (const [kind,offer] of Object.entries(INITIATION_PRICES)) {
 const lookup=`voyager_initiation_${kind}_inclusive_${INITIATION_PRICING_VERSION}`;
 const listed=await stripe.prices.list({lookup_keys:[lookup],active:true,limit:2});
 if(listed.data.length>1) throw new Error('Ambiguous current price');
 const price=listed.data[0]??await stripe.prices.create({product:product.id,unit_amount:offer.amount,currency:'usd',tax_behavior:'inclusive',lookup_key:lookup,metadata:{order_kind:kind,pricing_version:INITIATION_PRICING_VERSION}},{idempotencyKey:lookup});
 if(price.product!==product.id||price.unit_amount!==offer.amount||!price.livemode||!price.active||price.type!=='one_time'||price.currency!=='usd'||price.tax_behavior!=='inclusive') throw new Error('Current price verification failed');
 prices[kind]=price.id;
}
console.log('VOYAGER_BUNDLE_PRICE_CONFIG '+JSON.stringify({mode:'live',version:INITIATION_PRICING_VERSION,product:product.id,prices}));
