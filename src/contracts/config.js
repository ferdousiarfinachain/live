import presaleAbi from './abis/presale.json'
import { bscMainnetChain, bscTestnetChain, ethereum } from '../wallet/chains.js'

const chainsById = {
  1: ethereum,
  56: bscMainnetChain,
  97: bscTestnetChain,
}

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

export function getExplorerTxUrl(chainIdValue, transactionHash) {
  const txHash = String(transactionHash ?? '').trim()
  if (!txHash) {
    return ''
  }
  const base = EXPLORER_BASE_URLS[chainIdValue] ?? 'https://etherscan.io/tx/'
  return `${base}${txHash}`
}
