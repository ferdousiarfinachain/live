import presaleAbi from './abis/presale.json'
import { bscMainnetChain, bscTestnetChain, ethereum } from '../wallet/chains.js'

export {
  getConfiguredTreasuryNetworks,
  getExplorerTxUrl,
  getTreasuryAddress,
  getTreasuryChain,
  getTreasuryNetworksForMethod,
  getTreasuryTokenAddress,
  isTreasuryConfigured,
  isTreasuryMethodConfigured,
  isTreasuryRouteConfigured,
} from './treasuryChains.js'

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

export const isPresaleConfigured = Boolean(presaleContractAddress)
