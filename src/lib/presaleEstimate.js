const PRESALE_TOKEN_PRICE_USD = (() => {
  const raw = (import.meta.env.VITE_PRESALE_TOKEN_PRICE_USD ?? '0.0007').toString().trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0.0007
})()

export function estimateTokensFromTreasuryPayment(paymentMethod, amountHuman, { ethUsdPrice = null } = {}) {
  const amount = Number(String(amountHuman ?? '').trim())
  if (!Number.isFinite(amount) || amount <= 0) {
    return ''
  }

  let usdValue = amount
  if (paymentMethod === 'ETH') {
    const price = Number(ethUsdPrice)
    if (!Number.isFinite(price) || price <= 0) {
      return ''
    }
    usdValue = amount * price
  }

  return (usdValue / PRESALE_TOKEN_PRICE_USD).toFixed(2)
}
