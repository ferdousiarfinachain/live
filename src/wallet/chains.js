import { defineChain } from 'viem'
import {
  arbitrum,
  avalanche,
  base,
  mainnet as ethereum,
  optimism,
  polygon,
} from 'viem/chains'

const BSC_TESTNET_RPC = (
  import.meta.env.VITE_BSC_TESTNET_RPC || 'https://data-seed-prebsc-1-s1.binance.org:8545'
)
  .toString()
  .trim()

const BSC_MAINNET_RPC = (
  import.meta.env.VITE_BSC_MAINNET_RPC || 'https://bsc-dataseed.binance.org'
)
  .toString()
  .trim()

/** Public Binance RPC for wallet network adds. */
export const bscTestnetChain = defineChain({
  id: 97,
  name: 'BNB Smart Chain Testnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'tBNB',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [BSC_TESTNET_RPC] },
  },
  blockExplorers: {
    default: {
      name: 'BscScan',
      url: 'https://testnet.bscscan.com',
    },
  },
  testnet: true,
})

export const bscMainnetChain = defineChain({
  id: 56,
  name: 'BNB Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [BSC_MAINNET_RPC] },
  },
  blockExplorers: {
    default: {
      name: 'BscScan',
      url: 'https://bscscan.com',
    },
  },
})

export { arbitrum, avalanche, base, ethereum, optimism, polygon }

const chainsById = new Map(
  [
    bscTestnetChain,
    bscMainnetChain,
    ethereum,
    arbitrum,
    base,
    optimism,
    polygon,
    avalanche,
  ].map((chain) => [chain.id, chain]),
)

export const wagmiChains = [
  bscMainnetChain,
  bscTestnetChain,
  ethereum,
  arbitrum,
  base,
  optimism,
  polygon,
  avalanche,
]

export function getChainById(chainId) {
  return chainsById.get(Number(chainId)) ?? null
}

export function getDefaultAppRpc(chain) {
  const projectId = (import.meta.env.VITE_REOWN_PROJECT_ID ?? '').toString().trim()
  const chainId = Number(chain?.id)
  if (projectId && Number.isFinite(chainId) && chainId > 0) {
    return `https://rpc.walletconnect.org/v1/?chainId=eip155:${chainId}&projectId=${projectId}`
  }
  return chain?.rpcUrls?.default?.http?.[0] ?? ''
}
