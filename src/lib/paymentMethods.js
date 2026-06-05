export const CONTRACT_PAYMENT_METHODS = ['BNB']
export const TREASURY_PAYMENT_METHODS = ['ETH', 'USDT', 'USDC']

export function isTreasuryPaymentMethod(paymentMethod) {
  return TREASURY_PAYMENT_METHODS.includes(paymentMethod)
}

export function isContractPaymentMethod(paymentMethod) {
  return CONTRACT_PAYMENT_METHODS.includes(paymentMethod)
}
