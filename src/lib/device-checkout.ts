import {
  getBatchRemainingQuantity,
  type DeviceBatch,
} from '@/lib/device-batches'

export const DEVICE_ORDER_PRODUCT_TYPE = 'device_batch_claim'
export const DEVICE_CHECKOUT_HOLD_SECONDS = 35 * 60

// Stripe expects the amount in the currency's minor unit. ISK and UGX remain
// two-decimal for charge API compatibility, so they are intentionally absent.
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
])

export type DeviceCheckoutDetails = {
  batch: DeviceBatch
  amount: number
  currency: string
}

export type DeviceCheckoutValidation =
  | { ok: true; details: DeviceCheckoutDetails }
  | { ok: false; status: number; error: string }

export function toStripeMinorUnits(amount: number, currency: string): number {
  const normalizedCurrency = currency.trim().toLowerCase()
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Price must be greater than zero')
  }
  if (!/^[a-z]{3}$/.test(normalizedCurrency)) {
    throw new Error('Currency must be a three-letter ISO code')
  }

  const multiplier = ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency) ? 1 : 100
  const minorUnits = Math.round(amount * multiplier)
  if (Math.abs(minorUnits / multiplier - amount) > Number.EPSILON * 10) {
    throw new Error(
      ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)
        ? `${normalizedCurrency.toUpperCase()} does not support fractional amounts`
        : 'Price supports at most two decimal places',
    )
  }
  return minorUnits
}

export function formatStripeMinorUnits(amount: number, currency: string) {
  const normalizedCurrency = currency.trim().toLowerCase()
  const divisor = ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency) ? 1 : 100
  const majorAmount = amount / divisor
  const currencyCode = normalizedCurrency.toUpperCase()

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    return `${majorAmount.toLocaleString('en-US')} ${currencyCode || '---'}`
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(majorAmount)
  } catch {
    return `${majorAmount.toLocaleString('en-US')} ${currencyCode}`
  }
}

export function isCheckoutAmountValid(
  productType: string,
  expectedAmount: number | null,
  receivedAmount: number | null,
) {
  if (expectedAmount == null || receivedAmount == null || receivedAmount < 0) return false
  return productType === DEVICE_ORDER_PRODUCT_TYPE
    ? receivedAmount === expectedAmount
    : receivedAmount <= expectedAmount
}

export function getDeviceCheckoutExpiration(now = new Date()) {
  return new Date(now.getTime() + DEVICE_CHECKOUT_HOLD_SECONDS * 1000)
}

export function getDeviceCheckoutDetailsForBatch(
  batch: DeviceBatch,
): DeviceCheckoutValidation {
  if (batch.status !== 'claim_open') {
    return { ok: false, status: 409, error: 'Claims are not open for this batch' }
  }
  if (!batch.claimPrice) {
    return { ok: false, status: 409, error: 'Price has not been configured for this batch' }
  }
  if (getBatchRemainingQuantity(batch) === 0) {
    return { ok: false, status: 409, error: 'This batch is fully claimed' }
  }

  try {
    return {
      ok: true,
      details: {
        batch,
        amount: toStripeMinorUnits(batch.claimPrice.amount, batch.claimPrice.currency),
        currency: batch.claimPrice.currency.toLowerCase(),
      },
    }
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Invalid batch price',
    }
  }
}
