import { appChain } from '../contracts/config.js'

export const reownProjectId = (import.meta.env.VITE_REOWN_PROJECT_ID || '').toString().trim()

export const isWalletConfigured = Boolean(reownProjectId)

export const appChains = [appChain]

export const defaultChain = appChain

export const requiredNetworkLabel = appChain.name || 'BNB Smart Chain'
export const requiredChainId = appChain.id

const CANONICAL_APP_URL = 'https://www.novexlabs.xyz'

function resolveAppOrigin() {
  if (typeof window === 'undefined') {
    return CANONICAL_APP_URL
  }
  const { origin } = window.location
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return origin
  }
  return CANONICAL_APP_URL
}

export const appMetadata = {
  name: 'Novex Labs',
  description: 'Connect your wallet to Novex Labs',
  url: resolveAppOrigin(),
  icons: [`${resolveAppOrigin().replace(/\/$/, '')}/social-preview.png`],
}
