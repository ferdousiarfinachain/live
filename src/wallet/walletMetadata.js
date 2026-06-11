import { appChain } from '../contracts/config.js'

export const reownProjectId = (import.meta.env.VITE_REOWN_PROJECT_ID || '').toString().trim()

export const isWalletConfigured = Boolean(reownProjectId)

export const appChains = [appChain]

export const defaultChain = appChain

export const requiredNetworkLabel = appChain.name || 'BNB Smart Chain'
export const requiredChainId = appChain.id

export const appMetadata = {
  name: 'Novex Labs',
  description: 'Connect your wallet to Novex Labs',
  url:
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:5173',
  icons: ['https://walletconnect.com/walletconnect-logo.png'],
}
