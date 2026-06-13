import { appChain } from '../contracts/config.js'

export const reownProjectId = (import.meta.env.VITE_REOWN_PROJECT_ID || '').toString().trim()

export const isWalletConfigured = Boolean(reownProjectId)

export const defaultChain = appChain

/** Must match Reown allowlist + the exact URL users load on mobile (www). */
const CANONICAL_APP_URL = 'https://www.novexlabs.xyz'

function isLocalDevOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
}

function isPreviewOrigin(origin) {
  try {
    return new URL(origin).hostname.endsWith('.vercel.app')
  } catch {
    return false
  }
}

function isProductionOrigin(origin) {
  try {
    const hostname = new URL(origin).hostname.toLowerCase()
    return hostname === 'www.novexlabs.xyz' || hostname === 'novexlabs.xyz'
  } catch {
    return false
  }
}

/** URL passed to WalletConnect Verify API — fixed on production, dynamic on dev/preview. */
function getAppMetadataUrl() {
  if (typeof window === 'undefined') {
    return CANONICAL_APP_URL
  }

  const origin = window.location.origin.replace(/\/$/, '')

  if (isLocalDevOrigin(origin) || isPreviewOrigin(origin)) {
    return origin
  }

  if (isProductionOrigin(origin)) {
    return CANONICAL_APP_URL
  }

  return origin
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
