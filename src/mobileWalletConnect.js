const MOBILE_WALLET_DOWNLOAD = {
  metaMask:
    import.meta.env.VITE_METAMASK_DOWNLOAD_URL || 'https://metamask.io/download/',
  coinbase:
    import.meta.env.VITE_COINBASE_WALLET_DOWNLOAD_URL ||
    'https://www.coinbase.com/wallet/downloads',
  walletConnect:
    import.meta.env.VITE_WALLETCONNECT_INFO_URL || 'https://walletconnect.com/explorer',
}

const MOBILE_WALLET_STORE = {
  metaMask: {
    android: 'https://play.google.com/store/apps/details?id=io.metamask',
    ios: 'https://apps.apple.com/app/metamask/id1438144202',
    default: MOBILE_WALLET_DOWNLOAD.metaMask,
  },
  coinbase: {
    android: 'https://play.google.com/store/apps/details?id=org.toshi',
    ios: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
    default: MOBILE_WALLET_DOWNLOAD.coinbase,
  },
}

export function isMobileDevice() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|CriOS|FxiOS|EdgiOS/i.test(ua)) {
    return true
  }
  return Boolean(window.matchMedia?.('(pointer: coarse)')?.matches)
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent || '')
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || '')
}

function normalizeTarget(target) {
  return `${target || ''}`.toLowerCase()
}

function getDappUrl() {
  return window.location.href
}

function resolveWalletConnectConnector(connectors) {
  return connectors.find((connector) => {
    const id = (connector.id || '').toLowerCase()
    const name = (connector.name || '').toLowerCase()
    const type = (connector.type || '').toLowerCase()
    return id.includes('walletconnect') || name.includes('walletconnect') || type.includes('walletconnect')
  })
}

function resolveInjectedOnlyConnector(connectors) {
  return connectors.find((connector) => (connector.id || '').toLowerCase() === 'injected')
}

export function hasInjectedWallet(target) {
  const eth = typeof window !== 'undefined' ? window.ethereum : null
  if (!eth) return false

  const normalized = normalizeTarget(target)
  if (normalized === 'metamask') return Boolean(eth.isMetaMask)
  if (normalized === 'coinbase') return Boolean(eth.isCoinbaseWallet)
  return false
}

function openMobileUrl(url) {
  if (!url) return
  window.location.assign(url)
}

function getStoreUrl(target) {
  const normalized = normalizeTarget(target)
  const store = normalized === 'coinbase' ? MOBILE_WALLET_STORE.coinbase : MOBILE_WALLET_STORE.metaMask
  if (isAndroid()) return store.android
  if (isIOS()) return store.ios
  return store.default
}

/**
 * Try native scheme first (hidden iframe), then universal link.
 * Avoids navigating the current tab to a blank Branch redirect page.
 */
function tryNativeThenUniversal(nativeUrl, universalUrl, storeUrl) {
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.setAttribute('aria-hidden', 'true')
  iframe.src = nativeUrl
  document.body.appendChild(iframe)

  window.setTimeout(() => {
    iframe.remove()
    if (document.visibilityState !== 'visible') return
    openMobileUrl(universalUrl)
    window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        openMobileUrl(storeUrl)
      }
    }, 2200)
  }, 900)
}

function openMetaMaskMobile() {
  const dappUrl = getDappUrl()
  const storeUrl = getStoreUrl('metaMask')
  const universal = `https://link.metamask.io/dapp/${encodeURIComponent(dappUrl)}`

  if (isAndroid()) {
    const fallback = encodeURIComponent(storeUrl)
    const intent = `intent://dapp?url=${encodeURIComponent(dappUrl)}#Intent;scheme=metamask;package=io.metamask;S.browser_fallback_url=${fallback};end`
    openMobileUrl(intent)
    return
  }

  if (isIOS()) {
    tryNativeThenUniversal(
      `metamask://dapp?url=${encodeURIComponent(dappUrl)}`,
      universal,
      storeUrl,
    )
    return
  }

  openMobileUrl(universal)
}

function openCoinbaseMobile() {
  const dappUrl = getDappUrl()
  const storeUrl = getStoreUrl('coinbase')
  const universal = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(dappUrl)}`

  if (isAndroid()) {
    const fallback = encodeURIComponent(storeUrl)
    const intent = `intent://dapp?url=${encodeURIComponent(dappUrl)}#Intent;scheme=cbwallet;package=org.toshi;S.browser_fallback_url=${fallback};end`
    openMobileUrl(intent)
    return
  }

  if (isIOS()) {
    tryNativeThenUniversal(
      `cbwallet://dapp?url=${encodeURIComponent(dappUrl)}`,
      universal,
      storeUrl,
    )
    return
  }

  openMobileUrl(universal)
}

export function openMobileWalletApp(target) {
  const normalized = normalizeTarget(target)
  if (normalized === 'metamask') {
    openMetaMaskMobile()
    return
  }
  if (normalized === 'coinbase') {
    openCoinbaseMobile()
    return
  }
  openMobileUrl(getStoreUrl(target))
}

export function openMobileWalletDownload(target) {
  const normalized = normalizeTarget(target)
  if (normalized === 'walletconnect') {
    openMobileUrl(MOBILE_WALLET_DOWNLOAD.walletConnect)
    return
  }
  if (normalized === 'metamask' || normalized === 'coinbase') {
    openMobileUrl(getStoreUrl(target))
    return
  }
  openMobileUrl(MOBILE_WALLET_DOWNLOAD.walletConnect)
}

/**
 * Mobile-only connect. WalletConnect button uses WC modal (unchanged).
 * MetaMask / Coinbase open the native app via dapp deep link when not already injected.
 */
export async function connectMobileWallet({ target, connectAsync, connectors }) {
  const normalized = normalizeTarget(target)

  if (normalized === 'walletconnect') {
    const walletConnectConnector = resolveWalletConnectConnector(connectors)
    if (!walletConnectConnector) {
      return { status: 'fallback', target }
    }
    await connectAsync({ connector: walletConnectConnector })
    return { status: 'connected' }
  }

  if (normalized !== 'metamask' && normalized !== 'coinbase') {
    return { status: 'fallback', target }
  }

  // Inside wallet in-app browser only — use injected(), never coinbaseWallet() (SDK not loaded on mobile web).
  if (hasInjectedWallet(target)) {
    const injectedConnector = resolveInjectedOnlyConnector(connectors)
    if (injectedConnector) {
      try {
        await connectAsync({ connector: injectedConnector })
        return { status: 'connected' }
      } catch {
        // Fall through to deep link if in-app connect fails.
      }
    }
  }

  openMobileWalletApp(target)
  return { status: 'redirected' }
}
