import { defineChain } from 'thirdweb'
import { ethereum } from 'thirdweb/chains'
import presaleAbi from './abis/presale.json'

export {
  getConfiguredTreasuryNetworks,
  getExplorerTxUrl,
  getTreasuryAddress,
  getTreasuryChain,
  getTreasuryNetworksForMethod,
  getTreasuryTokenAddress,
  isTreasuryConfigured,
  isTreasuryMethodConfigured,
  isTreasuryQuoteEnabled,
  isTreasuryRouteConfigured,
} from './treasuryChains.js'

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

/** Public Binance RPC — avoids thirdweb default `97.rpc.thirdweb.com` in MetaMask. */
export const bscTestnetChain = defineChain({
  id: 97,
  name: 'BNB Smart Chain Testnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'tBNB',
    decimals: 18,
  },
  rpc: BSC_TESTNET_RPC,
  blockExplorers: [
    {
      name: 'BscScan',
      url: 'https://testnet.bscscan.com',
    },
  ],
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
  rpc: BSC_MAINNET_RPC,
  blockExplorers: [
    {
      name: 'BscScan',
      url: 'https://bscscan.com',
    },
  ],
})

const chainsById = {
  1: ethereum,
  56: bscMainnetChain,
  97: bscTestnetChain,
}

function envInt(name, fallback) {
  const raw = import.meta.env[name]
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function envAddress(name) {
  const raw = (import.meta.env[name] ?? '').toString().trim()
  return raw || null
}

export const chainId = envInt('VITE_CHAIN_ID', 97)
export const appChain = chainsById[chainId] ?? bscTestnetChain

export const presaleContractAddress = envAddress('VITE_PRESALE_CONTRACT_ADDRESS')
export const presaleAbiExport = presaleAbi

export const isPresaleConfigured = Boolean(presaleContractAddress && import.meta.env.VITE_THIRDWEB_CLIENT_ID)
