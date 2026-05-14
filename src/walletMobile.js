/**
 * Mobile wallet UX helpers (detection, deep links, WalletConnect URI routing).
 */

export function isCoarseMobile() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
}

/**
 * In-app browsers that often break WalletConnect / injected providers.
 * @returns {string | null} reason key for UI copy
 */
export function getMobileBrowserSupportReason() {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent || ''
  if (/Instagram|FBAN|FBAV/i.test(ua)) return 'instagram-facebook'
  if (/\bFB[\w_]+\//i.test(ua)) return 'instagram-facebook'
  if (/Line\//i.test(ua)) return 'line'
  if (/\bTikTok/i.test(ua)) return 'tiktok'
  return null
}

export function getNativeEthereum() {
  if (typeof window === 'undefined') return undefined
  return window.ethereum
}

export function isMetaMaskInjected(eth = getNativeEthereum()) {
  if (!eth) return false
  if (eth.isTrust) return false
  if (eth.isCoinbaseWallet) return false
  return Boolean(eth.isMetaMask)
}

export function isTrustWalletInjected(eth = getNativeEthereum()) {
  return Boolean(eth?.isTrust)
}

export function isCoinbaseWalletInjected(eth = getNativeEthereum()) {
  return Boolean(eth?.isCoinbaseWallet)
}

export function currentPageHref() {
  if (typeof window === 'undefined') return ''
  return window.location.href
}

/** Opens the current dapp inside MetaMask Mobile (injected provider available there). */
export function metaMaskDappUniversalLink(url = currentPageHref()) {
  return `https://metamask.app.link/dapp/${encodeURIComponent(url)}`
}

/** Opens the current URL inside Trust Wallet (in-app browser). */
export function trustWalletOpenUrlLink(url = currentPageHref()) {
  return `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(url)}`
}

/** Opens the current dapp inside Coinbase Wallet (in-app browser). */
export function coinbaseWalletDappLink(url = currentPageHref()) {
  return `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`
}

/**
 * WalletConnect pairing URI → wallet-specific universal / deep link.
 * @param {'metaMask' | 'trustWallet' | 'coinbase' | 'walletConnect'} walletKey
 * @param {string} uri wc: or https:// bridge URI from WalletConnect
 */
export function walletConnectUriDeepLink(walletKey, uri) {
  const enc = encodeURIComponent(uri)
  switch (walletKey) {
    case 'metaMask':
      return `https://metamask.app.link/wc?uri=${enc}`
    case 'trustWallet':
      return `https://link.trustwallet.com/wc?uri=${enc}`
    case 'coinbase':
      return `https://keys.coinbase.com/wallet/wc?uri=${enc}`
    case 'walletConnect':
    default:
      return `https://walletconnect.com/wc?uri=${enc}`
  }
}

/**
 * Subscribe to WalletConnect `display_uri` and open a mobile deep link (no QR modal).
 * @returns {Promise<() => void>} cleanup
 */
export async function attachWalletConnectDisplayUriDeepLink(connector, walletKey) {
  const provider = await connector.getProvider()
  const handler = (uri) => {
    if (typeof uri !== 'string' || uri.length === 0) return
    window.location.assign(walletConnectUriDeepLink(walletKey, uri))
  }
  if (typeof provider.on === 'function') {
    provider.on('display_uri', handler)
    return () => {
      if (typeof provider.removeListener === 'function') provider.removeListener('display_uri', handler)
      else if (typeof provider.off === 'function') provider.off('display_uri', handler)
    }
  }
  return () => {}
}
