export function estimateTokensFromUsdValue(usdValue, tokenPriceUsd) {
  const usd = Number(usdValue)
  const price = Number(tokenPriceUsd)
  if (!Number.isFinite(usd) || usd <= 0 || !Number.isFinite(price) || price <= 0) {
    return ''
  }
  return (usd / price).toFixed(2)
}

export function estimateTokensFromTreasuryPayment(
  paymentMethod,
  amountHuman,
  { ethUsdPrice = null, tokenPriceUsd = null } = {},
) {
  const amount = Number(String(amountHuman ?? '').trim())
  if (!Number.isFinite(amount) || amount <= 0) {
    return ''
  }

  let usdValue = amount
  if (paymentMethod === 'ETH') {
    const ethPrice = Number(ethUsdPrice)
    if (!Number.isFinite(ethPrice) || ethPrice <= 0) {
      return ''
    }
    usdValue = amount * ethPrice
  }

  return estimateTokensFromUsdValue(usdValue, tokenPriceUsd)
}
