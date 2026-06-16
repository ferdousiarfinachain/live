import { isTreasuryConfigured } from '../treasury/chains.js'

export const TREASURY_PAYMENT_METHODS = ['ETH', 'USDT', 'USDC']

export function isTreasuryPaymentMethod(paymentMethod) {
  return TREASURY_PAYMENT_METHODS.includes(paymentMethod)
}

export function getTreasuryQuoteNetworkKey(paymentMethod, treasuryNetworkKey = '') {
  return treasuryNetworkKey
}

export function isTreasuryQuoteEnabled(paymentMethod) {
  return isTreasuryPaymentMethod(paymentMethod) && isTreasuryConfigured(paymentMethod)
}
