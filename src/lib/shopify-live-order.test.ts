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
