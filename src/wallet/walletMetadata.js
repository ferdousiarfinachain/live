import { appChain } from '../contracts/config.js'

export const reownProjectId = (import.meta.env.VITE_REOWN_PROJECT_ID || '').toString().trim()

export const isWalletConfigured = Boolean(reownProjectId)

export const appChains = [appChain]

export const defaultChain = appChain

export const requiredNetworkLabel = appChain.name || 'BNB Smart Chain'
export const requiredChainId = appChain.id

/** Must match Reown allowlist + the exact URL users load on mobile (www). */
export const CANONICAL_APP_URL = 'https://www.novexlabs.xyz'

/** Build metadata at connect time — url must exactly match the page MetaMask verifies. */
export function getAppMetadata() {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin.replace(/\/$/, '')

    return {
      name: 'Novex Labs',
      description: 'Connect your wallet to Novex Labs',
      url: origin,
      icons: [`${origin}/social-preview.png`],
    }
  }

  return {
    name: 'Novex Labs',
    description: 'Connect your wallet to Novex Labs',
    url: CANONICAL_APP_URL,
    icons: [`${CANONICAL_APP_URL}/social-preview.png`],
  }
}

export const appMetadata = getAppMetadata()
