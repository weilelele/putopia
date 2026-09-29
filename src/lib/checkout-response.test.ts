import { describe, expect, it } from 'vitest'
import { parseCheckoutResponse } from './checkout-response'

describe('checkout response parsing', () => {
  it('handles HTML gateway errors without exposing JSON syntax errors', () => {
    expect(parseCheckoutResponse('<!DOCTYPE html><h1>Bad Gateway</h1>')).toEqual({})
    expect(parseCheckoutResponse('')).toEqual({})
  })
  it('preserves checkout URLs and actionable server errors', () => {
    expect(parseCheckoutResponse('{"url":"https://checkout.stripe.com/test"}').url).toBe('https://checkout.stripe.com/test')
    expect(parseCheckoutResponse('{"error":"Please release the previous reservation"}').error).toBe('Please release the previous reservation')
  })
  it('rejects unexpected JSON shapes and field types', () => {
    for (const body of ['null', '[]', '123', '"error"']) expect(parseCheckoutResponse(body)).toEqual({})
    expect(parseCheckoutResponse('{"url":true,"error":{"message":"bad"}}')).toEqual({ url: undefined, error: undefined })
  })
})
