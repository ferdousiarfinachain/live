import { appChain } from '../contracts/config.js'

export const reownProjectId = (import.meta.env.VITE_REOWN_PROJECT_ID || '').toString().trim()

export const isWalletConfigured = Boolean(reownProjectId)

export const defaultChain = appChain

/** URL passed to WalletConnect Verify API — always matches the page origin. */
function getAppMetadataUrl() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.location.origin.replace(/\/$/, '')
}

/** Build metadata at connect time — url must exactly match the page MetaMask verifies. */
export function getAppMetadata() {
  const url = getAppMetadataUrl()

  return {
    name: 'Novex Labs',
    description: 'Connect your wallet to Novex Labs',
    url,
    icons: [`${url}/social-preview.png`],
  }
}
