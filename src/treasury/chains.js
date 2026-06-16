import {
  arbitrum,
  avalanche,
  base,
  bscMainnetChain,
  ethereum,
  optimism,
  polygon,
} from '../wallet/chains.js'

function envAddress(name) {
  const raw = (import.meta.env[name] ?? '').toString().trim()
  return raw || null
}

export const treasuryAddress = envAddress('VITE_TREASURY_ADDRESS')

export const ETH_NATIVE_NETWORK_KEYS = ['ethereum', 'arbitrum', 'base', 'optimism']

export const STABLECOIN_NETWORK_KEYS = [
  'ethereum',
  'bsc',
  'arbitrum',
  'base',
  'optimism',
  'polygon',
  'avalanche',
]

const NETWORK_CHAINS = {
  ethereum: { chain: ethereum, label: 'Ethereum' },
  bsc: { chain: bscMainnetChain, label: 'BNB Chain' },
  arbitrum: { chain: arbitrum, label: 'Arbitrum' },
  base: { chain: base, label: 'Base' },
  optimism: { chain: optimism, label: 'Optimism' },
  polygon: { chain: polygon, label: 'Polygon' },
  avalanche: { chain: avalanche, label: 'Avalanche' },
}

const STABLECOIN_DECIMALS = {
  USDT: {
    ethereum: 6,
    bsc: 18,
    arbitrum: 6,
    base: 6,
    optimism: 6,
    polygon: 6,
    avalanche: 6,
  },
  USDC: {
    ethereum: 6,
    bsc: 18,
    arbitrum: 6,
    base: 6,
    optimism: 6,
    polygon: 6,
    avalanche: 6,
  },
}

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

export const CHAINLINK_ETH_USD_FEEDS = {
  ethereum: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  arbitrum: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
  base: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
  optimism: '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
}

export const TREASURY_RPC_URLS = {
  ethereum: 'https://ethereum.publicnode.com',
  arbitrum: 'https://arbitrum.publicnode.com',
  base: 'https://base.publicnode.com',
  optimism: 'https://optimism.publicnode.com',
  polygon: 'https://polygon.publicnode.com',
  avalanche: 'https://avalanche.publicnode.com',
}

const CHAIN_ID_TO_NETWORK_KEY = {
  1: 'ethereum',
  56: 'bsc',
  42161: 'arbitrum',
  8453: 'base',
  10: 'optimism',
  137: 'polygon',
  43114: 'avalanche',
}

export function getTreasuryNetworkKeyByChainId(chainId) {
  return CHAIN_ID_TO_NETWORK_KEY[Number(chainId)] ?? ''
}

export function getTreasuryNetworkKeys(paymentMethod) {
  if (paymentMethod === 'ETH') {
    return ETH_NATIVE_NETWORK_KEYS
  }
  if (paymentMethod === 'USDT' || paymentMethod === 'USDC') {
    return STABLECOIN_NETWORK_KEYS
  }
  return []
}

export function getTreasuryChain(networkKey) {
  return NETWORK_CHAINS[networkKey]?.chain ?? null
}

export function getTreasuryNetworkLabel(networkKey) {
  return NETWORK_CHAINS[networkKey]?.label ?? networkKey
}

export function getStablecoinContract(paymentMethod, networkKey) {
  if (paymentMethod !== 'USDT' && paymentMethod !== 'USDC') {
    return null
  }
  const chainId = getTreasuryChain(networkKey)?.id
  if (!chainId) {
    return null
  }
  return STABLECOIN_CONTRACTS[paymentMethod]?.[chainId] ?? null
}

export function getChainlinkEthUsdFeed(networkKey) {
  return CHAINLINK_ETH_USD_FEEDS[networkKey] ?? null
}

export function getStablecoinDecimals(paymentMethod, networkKey) {
  return STABLECOIN_DECIMALS[paymentMethod]?.[networkKey] ?? 6
}

export function isTreasuryRouteConfigured(paymentMethod, networkKey) {
  if (!treasuryAddress) {
    return false
  }
  if (paymentMethod === 'ETH') {
    return ETH_NATIVE_NETWORK_KEYS.includes(networkKey) && Boolean(getTreasuryChain(networkKey))
  }
  if (paymentMethod === 'USDT' || paymentMethod === 'USDC') {
    return (
      STABLECOIN_NETWORK_KEYS.includes(networkKey) &&
      Boolean(getTreasuryChain(networkKey)) &&
      Boolean(getStablecoinContract(paymentMethod, networkKey))
    )
  }
  return false
}

export function getConfiguredTreasuryNetworks(paymentMethod) {
  return getTreasuryNetworkKeys(paymentMethod).filter((networkKey) =>
    isTreasuryRouteConfigured(paymentMethod, networkKey),
  )
}

export function isTreasuryConfigured(paymentMethod) {
  return getConfiguredTreasuryNetworks(paymentMethod).length > 0
}
