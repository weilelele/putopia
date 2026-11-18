import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  shopifyLiveCheckoutAttribute, shopifyLiveReservationReference, verifyShopifyLiveOrder,
  verifyShopifyLiveWebhook, type ShopifyLiveOrder,
} from './shopify-live-order'

const secret = 'test-secret'
const reservation = {
  shop:'jtuuus-k3.myshopify.com', id:'82000000-0000-4000-8000-000000000001', userId:'82000000-0000-4000-8000-000000000002',
  email:'checkout@example.com', kind:'initial' as const, variantId:'gid://shopify/ProductVariant/30',
}
const money = (amount: string) => ({ shopMoney:{amount,currencyCode:'USD'}, presentmentMoney:{amount,currencyCode:'USD'} })
const authId = 'gid://shopify/OrderTransaction/444'

function order(): ShopifyLiveOrder {
  return {
    id:'gid://shopify/Order/886', test:false, email:reservation.email, updatedAt:'2026-11-17T00:00:00Z',
    cancelledAt:null, displayFinancialStatus:'AUTHORIZED',
    customAttributes:[{key:shopifyLiveCheckoutAttribute,value:shopifyLiveReservationReference(reservation,secret)}],
    shippingAddress:{name:'Fixture Buyer',address1:'1 Test St',address2:null,city:'Santa Clara',provinceCode:'CA',zip:'95054',countryCodeV2:'US'},
    totalPriceSet:money('38.00'),currentTotalPriceSet:money('38.00'),totalShippingPriceSet:money('0'),totalDiscountsSet:money('0'),
    lineItems:{pageInfo:{hasNextPage:false},nodes:[1,2].map(n=>({id:String(n),sku:`INITIAL-PACK-${n}`,quantity:1,requiresShipping:true,
      lineItemGroup:{id:'group',quantity:1,variantId:reservation.variantId}}))},
    transactions:[{id:authId,kind:'AUTHORIZATION',status:'SUCCESS',test:false,gateway:'shopify_payments',
      amountSet:money('38'),processedAt:null,parentTransaction:null}],refunds:[],fulfillments:[],
  }
}

describe('production Shopify payment evidence',()=>{
  it('distinguishes authorization from a full capture with the verified parent transaction',()=>{
    const remote=order()
    expect(verifyShopifyLiveOrder(remote,reservation,secret).state).toBe('authorized')
    remote.displayFinancialStatus='PAID'
    const capture={...remote.transactions[0],id:'gid://shopify/OrderTransaction/445',kind:'CAPTURE',processedAt:'2026-11-17T00:00:00Z'}
    remote.transactions.push(capture)
    expect(()=>verifyShopifyLiveOrder(remote,reservation,secret)).toThrow(/captured in full/)
    remote.transactions[1]={...capture,parentTransaction:{id:authId}}
    expect(verifyShopifyLiveOrder(remote,reservation,secret)).toMatchObject({state:'paid',amount:3800})
  })

  it('rejects test orders, wrong buyers, incorrect totals, and unsupported delivery regions',()=>{
    expect(()=>verifyShopifyLiveOrder({...order(),test:true},reservation,secret)).toThrow(/formal/)
    expect(()=>verifyShopifyLiveOrder({...order(),email:'other@example.com'},reservation,secret)).toThrow(/reservation/)
    expect(()=>verifyShopifyLiveOrder({...order(),currentTotalPriceSet:money('37.99')},reservation,secret)).toThrow(/total/)
    const remote=order()
    remote.shippingAddress!.provinceCode='HI'
    expect(()=>verifyShopifyLiveOrder(remote,reservation,secret)).toThrow(/contiguous US/)
  })

  it('verifies the original body and shop before accepting webhook messages',()=>{
    const raw='{"id":886}'
    const signature=createHmac('sha256',secret).update(raw).digest('base64')
    const headers=new Headers({'x-shopify-topic':'orders/paid','x-shopify-shop-domain':reservation.shop,'x-shopify-hmac-sha256':signature})
    expect(verifyShopifyLiveWebhook(raw,headers,{shop:reservation.shop,secret})).toBe('orders/paid')
    expect(verifyShopifyLiveWebhook(raw+' ',headers,{shop:reservation.shop,secret})).toBeNull()
    expect(verifyShopifyLiveWebhook(raw,headers,{shop:'other.myshopify.com',secret})).toBeNull()
  })
})

describe('Voyager Membership and credited Shopify purchases', () => {
  function membership() {
    const source = { ...reservation, kind: 'membership' as const, referenceVersion: 2, amount: 1200,
      pricingVersion: 'voyager-membership-v1', membershipOrderId: null, initialOrderId: null }
    const remote = order()
    remote.shippingAddress = null
    remote.totalPriceSet = money('12')
    remote.currentTotalPriceSet = money('12')
    remote.transactions[0].amountSet = money('12')
    remote.lineItems.nodes = [{ id: 'digital', sku: 'VOYAGER-MEMBERSHIP-S26', quantity: 1, requiresShipping: false,
      variant: { id: source.variantId }, lineItemGroup: null }]
    remote.customAttributes[0].value = shopifyLiveReservationReference(source, secret)
    return { source, remote }
  }
  function capture(remote: ShopifyLiveOrder) {
    const payment = { ...remote.transactions[0], id: 'gid://shopify/OrderTransaction/445', kind: 'CAPTURE',
      parentTransaction: { id: authId }, processedAt: '2026-11-18T00:00:00Z' }
    remote.transactions.push(payment)
    remote.displayFinancialStatus = 'PAID'
    return payment
  }
  function refund(remote: ShopifyLiveOrder, amount: string, lines: string[]) {
    remote.displayFinancialStatus = amount === remote.totalPriceSet.shopMoney.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
    remote.refunds.push({ transactions: { nodes: [{ ...remote.transactions[1], id: 'gid://shopify/OrderTransaction/446',
      kind: 'REFUND', parentTransaction: { id: remote.transactions[1].id }, amountSet: money(amount) }], pageInfo: { hasNextPage: false } },
    refundLineItems: { nodes: lines.map(id => ({ quantity: 1, lineItem: { id } })), pageInfo: { hasNextPage: false } } })
  }
  it('opens digital Membership without requesting shipping or creating physical Pack evidence', () => {
    const { source, remote } = membership()
    expect(verifyShopifyLiveOrder(remote, source, secret)).toMatchObject({ state: 'authorized', shipping: null, amount: 1200 })
    capture(remote)
    expect(verifyShopifyLiveOrder(remote, source, secret)).toMatchObject({ state: 'paid', packs: {}, shipping: null })
  })
  it('binds the credit source and exact amount into the signed reference', () => {
    const { source, remote } = membership()
    expect(() => verifyShopifyLiveOrder(remote, { ...source, amount: 1000 }, secret)).toThrow(/reservation/)
    expect(() => verifyShopifyLiveOrder(remote, { ...source, membershipOrderId: reservation.userId }, secret)).toThrow(/reservation/)
  })
  it('does not accept physical items or another digital variant as Membership', () => {
    const { source, remote } = membership()
    remote.lineItems.nodes[0].requiresShipping = true
    expect(() => verifyShopifyLiveOrder(remote, source, secret)).toThrow(/digital Membership/)
    remote.lineItems.nodes[0].requiresShipping = false
    remote.lineItems.nodes[0].variant!.id = 'gid://shopify/ProductVariant/999'
    expect(() => verifyShopifyLiveOrder(remote, source, secret)).toThrow(/digital Membership/)
  })
  it('returns full original Membership refunds as reversal evidence', () => {
    const { source, remote } = membership()
    capture(remote)
    refund(remote, '12', ['digital'])
    remote.currentTotalPriceSet = money('0')
    expect(verifyShopifyLiveOrder(remote, source, secret)).toMatchObject({ state: 'reversed', refundedAmount: 1200, refundedPacks: [], review: false })
    remote.refunds[0].transactions.nodes[0].parentTransaction!.id = authId
    expect(() => verifyShopifyLiveOrder(remote, source, secret)).toThrow(/reverse the verified/)
  })
  it('validates a $26 upgrade and its $13 per-Pack cancellation refund', () => {
    const source = { ...reservation, referenceVersion: 2, amount: 2600, pricingVersion: 'voyager-membership-v1',
      membershipOrderId: reservation.userId, initialOrderId: null }
    const remote = order()
    remote.totalPriceSet = money('26')
    remote.currentTotalPriceSet = money('26')
    remote.transactions[0].amountSet = money('26')
    remote.customAttributes[0].value = shopifyLiveReservationReference(source, secret)
    capture(remote)
    refund(remote, '13', ['1'])
    remote.currentTotalPriceSet = money('13')
    expect(verifyShopifyLiveOrder(remote, source, secret)).toMatchObject({ state: 'reversed', refundedAmount: 1300, refundedPacks: [1], review: false })
  })
  it('flags partial cash refunds with ambiguous Pack allocation for review', () => {
    const remote = order()
    capture(remote)
    refund(remote, '1', [])
    remote.currentTotalPriceSet = money('37')
    expect(verifyShopifyLiveOrder(remote, reservation, secret)).toMatchObject({ state: 'reversed', refundedAmount: 100, review: true })
  })
})
