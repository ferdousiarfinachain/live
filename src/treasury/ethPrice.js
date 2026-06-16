import { formatUnits } from 'viem'
import { readContract } from 'viem/actions'
import {
  CHAINLINK_ETH_USD_FEEDS,
  ETH_NATIVE_NETWORK_KEYS,
  getChainlinkEthUsdFeed,
  getTreasuryChain,
} from './chains.js'
import { getTreasuryScanClient } from './scan.js'

const CHAINLINK_ABI = [
  {
    type: 'function',
    name: 'latestRoundData',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
  },
]

const PRICE_FETCH_TIMEOUT_MS = 5_000
let cachedPrice = null
let cachedAt = 0
const CACHE_MS = 60_000
let fetchInFlight = null

export function getCachedEthUsdPrice() {
  if (cachedPrice !== null && Date.now() - cachedAt < CACHE_MS) {
    return cachedPrice
  }
  return null
}

export function warmEthUsdPrice(preferredNetworkKey = '') {
  if (getCachedEthUsdPrice() !== null) {
    return Promise.resolve(cachedPrice)
  }
  if (fetchInFlight) {
    return fetchInFlight
  }
  fetchInFlight = fetchEthUsdPrice(preferredNetworkKey).finally(() => {
    fetchInFlight = null
  })
  return fetchInFlight
}

function withTimeout(promise, timeoutMs = PRICE_FETCH_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('ETH price fetch timed out')), timeoutMs)
    }),
  ])
}

async function readFeedPrice(networkKey) {
  const feedAddress = getChainlinkEthUsdFeed(networkKey)
  if (!feedAddress || !getTreasuryChain(networkKey)) {
    return null
  }

  const client = getTreasuryScanClient(networkKey)
  const [, answer] = await withTimeout(
    readContract(client, {
      address: feedAddress,
      abi: CHAINLINK_ABI,
      functionName: 'latestRoundData',
    }),
  )
  const price = Number(formatUnits(answer, 8))
  if (!Number.isFinite(price) || price <= 0) {
    return null
  }
  return price
}

function buildNetworkOrder(preferredNetworkKey = '') {
  const ordered = ['ethereum', preferredNetworkKey, ...ETH_NATIVE_NETWORK_KEYS]
  return [...new Set(ordered.filter(Boolean))]
}

export async function fetchEthUsdPrice(preferredNetworkKey = '') {
  if (cachedPrice !== null && Date.now() - cachedAt < CACHE_MS) {
    return cachedPrice
  }

  for (const networkKey of buildNetworkOrder(preferredNetworkKey)) {
    if (!CHAINLINK_ETH_USD_FEEDS[networkKey]) {
      continue
    }
    try {
      const price = await readFeedPrice(networkKey)
      if (price !== null) {
        cachedPrice = price
        cachedAt = Date.now()
        return price
      }
    } catch {
      // Try the next Chainlink feed.
    }
  }

  return cachedPrice
}
