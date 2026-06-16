import { getCachedEthUsdPrice } from './ethPrice.js'
import { readTreasuryPresaleTokenPriceUsd } from './presalePrice.js'
import { fetchEthUsdPrice } from './ethPrice.js'

function formatTokenEstimate(tokenAmount) {
  if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) {
    return ''
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(tokenAmount)
}

function resolveUsdValue(paymentMethod, amountHuman, ethUsdPrice) {
  const amount = Number(String(amountHuman ?? '').trim())
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0
  }

  if (paymentMethod === 'USDT' || paymentMethod === 'USDC') {
    return amount
  }

  if (paymentMethod === 'ETH' && ethUsdPrice) {
    return amount * ethUsdPrice
  }

  return 0
}

export function estimateTreasuryTokensSync(
  paymentMethod,
  amountHuman,
  { tokenPriceUsd = null, ethUsdPrice = null } = {},
) {
  if (!Number.isFinite(tokenPriceUsd) || tokenPriceUsd <= 0) {
    return ''
  }

  const resolvedEthUsd = ethUsdPrice ?? getCachedEthUsdPrice()
  const usdValue = resolveUsdValue(paymentMethod, amountHuman, resolvedEthUsd)
  if (usdValue <= 0) {
    return ''
  }

  return formatTokenEstimate(usdValue / tokenPriceUsd)
}

export async function estimateTreasuryTokens(
  paymentMethod,
  amountHuman,
  { tokenPriceUsd = null, treasuryNetworkKey = '' } = {},
) {
  const syncQuote = estimateTreasuryTokensSync(paymentMethod, amountHuman, {
    tokenPriceUsd,
    ethUsdPrice: getCachedEthUsdPrice(),
  })
  if (syncQuote) {
    return syncQuote
  }

  const presaleTokenPriceUsd = await readTreasuryPresaleTokenPriceUsd(tokenPriceUsd)
  if (!presaleTokenPriceUsd) {
    return ''
  }

  let ethUsdPrice = getCachedEthUsdPrice()
  if (paymentMethod === 'ETH' && !ethUsdPrice) {
    ethUsdPrice = await fetchEthUsdPrice(treasuryNetworkKey)
  }

  const usdValue = resolveUsdValue(paymentMethod, amountHuman, ethUsdPrice)
  if (usdValue <= 0) {
    return ''
  }

  return formatTokenEstimate(usdValue / presaleTokenPriceUsd)
}
