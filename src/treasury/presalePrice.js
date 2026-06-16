import { formatUnits } from 'viem'
import { readContract } from 'viem/actions'
import presaleAbi from '../contracts/abis/presale.json'
import { isPresaleConfigured, presaleContractAddress } from '../contracts/config.js'
import { getCachedPresaleTokenPriceUsd } from '../wallet/presaleContract.js'
import { getTreasuryScanClient } from './scan.js'

const USD_PRICE_DECIMALS = 8
const PRICE_CACHE_MS = 30_000

let cachedPriceUsd = null
let cachedAt = 0

async function readPresalePriceFromBsc() {
  if (!isPresaleConfigured || !presaleContractAddress) {
    return null
  }

  const client = getTreasuryScanClient('bsc')
  const stage = await readContract(client, {
    address: presaleContractAddress,
    abi: presaleAbi,
    functionName: 'currentStage',
  })
  const priceRaw = await readContract(client, {
    address: presaleContractAddress,
    abi: presaleAbi,
    functionName: 'usdPricePerTokenByStage',
    args: [BigInt(stage)],
  })
  const priceUsd = Number(formatUnits(priceRaw, USD_PRICE_DECIMALS))
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    return null
  }
  return priceUsd
}

export async function readTreasuryPresaleTokenPriceUsd(priceOverride = null) {
  if (Number.isFinite(priceOverride) && priceOverride > 0) {
    return priceOverride
  }

  const sharedCache = getCachedPresaleTokenPriceUsd()
  if (sharedCache !== null) {
    return sharedCache
  }

  if (cachedPriceUsd !== null && Date.now() - cachedAt < PRICE_CACHE_MS) {
    return cachedPriceUsd
  }

  try {
    const priceUsd = await readPresalePriceFromBsc()
    if (priceUsd !== null) {
      cachedPriceUsd = priceUsd
      cachedAt = Date.now()
      return priceUsd
    }
  } catch {
    // Fall through to stale cache below.
  }

  return cachedPriceUsd
}
