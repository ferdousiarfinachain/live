import { bsc, bscTestnet, ethereum } from 'thirdweb/chains'
import presaleAbi from './abis/presale.json'

const chainsById = {
  1: ethereum,
  56: bsc,
  97: bscTestnet,
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
export const appChain = chainsById[chainId] ?? bscTestnet

export const presaleContractAddress = envAddress('VITE_PRESALE_CONTRACT_ADDRESS')
export const presaleAbiExport = presaleAbi

export const paymentTokenAddresses = {
  BNB: null,
  USDT: envAddress('VITE_PAYMENT_TOKEN_USDT'),
  USDC: envAddress('VITE_PAYMENT_TOKEN_USDC'),
  ETH: envAddress('VITE_PAYMENT_TOKEN_ETH'),
}

export const isPresaleConfigured = Boolean(presaleContractAddress && import.meta.env.VITE_THIRDWEB_CLIENT_ID)
