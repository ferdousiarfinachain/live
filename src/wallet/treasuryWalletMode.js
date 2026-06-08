import { TREASURY_PAYMENT_METHODS } from '../lib/paymentMethods.js'

const manualTreasuryNetworkByPayment = Object.fromEntries(
  TREASURY_PAYMENT_METHODS.map((method) => [method, '']),
)
let pendingAppChainSwitch = false

export function getManualTreasuryNetworkKey(paymentMethod) {
  if (!paymentMethod) {
    return ''
  }
  return manualTreasuryNetworkByPayment[paymentMethod] || ''
}

export function setManualTreasuryNetworkKey(paymentMethod, networkKey) {
  if (!paymentMethod || !TREASURY_PAYMENT_METHODS.includes(paymentMethod)) {
    return
  }
  manualTreasuryNetworkByPayment[paymentMethod] = String(networkKey ?? '').trim()
}

export function clearManualTreasuryNetworkKey(paymentMethod) {
  if (!paymentMethod || !TREASURY_PAYMENT_METHODS.includes(paymentMethod)) {
    return
  }
  manualTreasuryNetworkByPayment[paymentMethod] = ''
}

export function isManualTreasuryMode(paymentMethod) {
  return Boolean(getManualTreasuryNetworkKey(paymentMethod))
}

export function markAppChainSwitch() {
  pendingAppChainSwitch = true
}

export function consumeAppChainSwitch() {
  const wasAppSwitch = pendingAppChainSwitch
  pendingAppChainSwitch = false
  return wasAppSwitch
}
