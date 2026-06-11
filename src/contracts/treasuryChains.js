import {
  arbitrum,
  avalanche,
  base,
  bscTreasuryChain,
  ethereum,
  optimism,
  polygon,
} from '../wallet/chains.js'
import { isTreasuryPaymentMethod, TREASURY_PAYMENT_METHODS } from '../lib/paymentMethods.js'
import { isSupabaseConfigured } from '../lib/supabaseClient.js'

function envAddress(name) {
  const raw = (import.meta.env[name] ?? '').toString().trim()
  return raw || null
}

export { bscTreasuryChain }

/** Native ETH — Ethereum, Arbitrum, Base, Optimism */
export const ETH_NATIVE_TREASURY_NETWORKS = [
  { key: 'ethereum', label: 'ETH', chainId: 1, chain: ethereum },
  { key: 'arbitrum', label: 'ARB', chainId: 42161, chain: arbitrum },
  { key: 'base', label: 'Base', chainId: 8453, chain: base },
  { key: 'optimism', label: 'OP', chainId: 10, chain: optimism },
]

/** USDT / USDC — 7 chains */
export const STABLECOIN_TREASURY_NETWORKS = [
  { key: 'ethereum', label: 'ETH', chainId: 1, chain: ethereum },
  { key: 'bsc', label: 'BSC', chainId: 56, chain: bscTreasuryChain },
  { key: 'arbitrum', label: 'ARB', chainId: 42161, chain: arbitrum },
  { key: 'base', label: 'Base', chainId: 8453, chain: base },
  { key: 'optimism', label: 'OP', chainId: 10, chain: optimism },
  { key: 'polygon', label: 'POL', chainId: 137, chain: polygon },
  { key: 'avalanche', label: 'AVAX', chainId: 43114, chain: avalanche },
]

const networksByKey = new Map()
for (const network of [...ETH_NATIVE_TREASURY_NETWORKS, ...STABLECOIN_TREASURY_NETWORKS]) {
  networksByKey.set(network.key, network)
}

export const treasuryAddress = envAddress('VITE_TREASURY_ADDRESS')

export function getTreasuryAddress() {
  return treasuryAddress
}

export function getTreasuryNetworksForMethod(paymentMethod) {
  if (paymentMethod === 'ETH') {
    return ETH_NATIVE_TREASURY_NETWORKS
  }
  if (paymentMethod === 'USDT' || paymentMethod === 'USDC') {
    return STABLECOIN_TREASURY_NETWORKS
  }
  return []
}

/** Official USDT / USDC contract addresses per chain (not your treasury wallet). */
const STABLECOIN_CONTRACTS = {
  USDT: {
    1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    56: '0x55d398326f99059fF775485246999027B3197955',
    42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    8453: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    43114: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
  },
  USDC: {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  },
}

export function getTreasuryTokenAddress(paymentMethod, chainId) {
  if (paymentMethod === 'ETH') {
    return null
  }
  return STABLECOIN_CONTRACTS[paymentMethod]?.[chainId] ?? null
}

export function getTreasuryNetwork(networkKey) {
  return networksByKey.get(networkKey) ?? null
}

export function getTreasuryChain(networkKey) {
  return getTreasuryNetwork(networkKey)?.chain ?? null
}

export function isTreasuryRouteConfigured(paymentMethod, networkKey) {
  if (!isTreasuryPaymentMethod(paymentMethod) || !isSupabaseConfigured || !treasuryAddress) {
    return false
  }

  const network = getTreasuryNetwork(networkKey)
  if (!network) {
    return false
  }

  const allowed = getTreasuryNetworksForMethod(paymentMethod)
  if (!allowed.some((item) => item.key === networkKey)) {
    return false
  }

  if (paymentMethod === 'ETH') {
    return true
  }

  return Boolean(getTreasuryTokenAddress(paymentMethod, network.chainId))
}

export function getConfiguredTreasuryNetworks(paymentMethod) {
  return getTreasuryNetworksForMethod(paymentMethod).filter((network) =>
    isTreasuryRouteConfigured(paymentMethod, network.key),
  )
}

export function isTreasuryMethodConfigured(paymentMethod) {
  return getConfiguredTreasuryNetworks(paymentMethod).length > 0
}

export const isTreasuryConfigured =
  isSupabaseConfigured &&
  TREASURY_PAYMENT_METHODS.every((method) => isTreasuryMethodConfigured(method))

const EXPLORER_BASE_URLS = {
  1: 'https://etherscan.io/tx/',
  10: 'https://optimistic.etherscan.io/tx/',
  56: 'https://bscscan.com/tx/',
  97: 'https://testnet.bscscan.com/tx/',
  137: 'https://polygonscan.com/tx/',
  8453: 'https://basescan.org/tx/',
  42161: 'https://arbiscan.io/tx/',
  43114: 'https://snowtrace.io/tx/',
  11155111: 'https://sepolia.etherscan.io/tx/',
}

export function getExplorerTxUrl(chainId, transactionHash) {
  const txHash = String(transactionHash ?? '').trim()
  if (!txHash) {
    return ''
  }
  const base = EXPLORER_BASE_URLS[chainId] ?? 'https://etherscan.io/tx/'
  return `${base}${txHash}`
}
