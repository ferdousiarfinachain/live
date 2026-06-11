import { readContract } from 'viem/actions'
import { getTreasuryChain } from '../contracts/treasuryChains.js'
import { isWalletConfigured } from '../wallet/walletMetadata.js'
import { getPublicClient } from '../wallet/viemClients.js'

/** Chainlink ETH/USD price feeds — Ethereum, Arbitrum, Base, Optimism */
export const CHAINLINK_ETH_USD_FEEDS = {
  ethereum: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  arbitrum: '0x639Fe6ab55C921f74e7fac1e960660eB0B8b8f4f',
  base: '0x71041dddad3585F32EC9bAf8705BE63A203b398e',
  optimism: '0x13e3Ee699D1909eC989761AE527A3Dd62773f226',
}

const CHAINLINK_AGGREGATOR_ABI = [
  {
    type: 'function',
    name: 'latestRoundData',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
]

const priceCache = new Map()
const CACHE_MS = 30_000

function getCachedPrice(networkKey) {
  const cached = priceCache.get(networkKey)
  if (!cached || cached.expiresAt <= Date.now()) {
    return null
  }
  return cached.price
}

export async function fetchEthUsdPrice(networkKey) {
  const feedAddress = CHAINLINK_ETH_USD_FEEDS[networkKey]
  if (!feedAddress) {
    return null
  }

  const cached = getCachedPrice(networkKey)
  if (cached !== null) {
    return cached
  }

  const chain = getTreasuryChain(networkKey)
  if (!chain || !isWalletConfigured) {
    return null
  }

  const client = getPublicClient(chain.id)

  const [roundData, decimals] = await Promise.all([
    readContract(client, {
      address: feedAddress,
      abi: CHAINLINK_AGGREGATOR_ABI,
      functionName: 'latestRoundData',
    }),
    readContract(client, {
      address: feedAddress,
      abi: CHAINLINK_AGGREGATOR_ABI,
      functionName: 'decimals',
    }),
  ])

  const answer = roundData?.answer ?? roundData?.[1]
  const price = Number(answer) / 10 ** Number(decimals)
  if (!Number.isFinite(price) || price <= 0) {
    return null
  }

  priceCache.set(networkKey, { price, expiresAt: Date.now() + CACHE_MS })
  return price
}
