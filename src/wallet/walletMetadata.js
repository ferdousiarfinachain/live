import { appChain } from '../contracts/config.js'

export const reownProjectId = (import.meta.env.VITE_REOWN_PROJECT_ID || '').toString().trim()

export const isWalletConfigured = Boolean(reownProjectId)

export const defaultChain = appChain

/** Fallback when `window` is unavailable (build/SSR). */
const CANONICAL_APP_URL = 'https://www.novexlabs.xyz'

/** WalletConnect Verify requires metadata.url === window.location.origin (exact). */
function getAppMetadataUrl() {
  if (typeof window === 'undefined') {
    return CANONICAL_APP_URL
  }

  return window.location.origin.replace(/\/$/, '')
}

/** Build metadata at connect time — url must exactly match the page the wallet verifies. */
export function getAppMetadata() {
  const url = getAppMetadataUrl()

  return {
    name: 'Novex Labs',
    description: 'Connect your wallet to Novex Labs',
    url,
    icons: [`${url}/social-preview.png`],
  }
}
