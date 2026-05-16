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
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
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

function resolveWalletConnectConnector(connectors) {
  return connectors.find((connector) => {
    const id = (connector.id || '').toLowerCase()
    const name = (connector.name || '').toLowerCase()
    const type = (connector.type || '').toLowerCase()
    return id.includes('walletconnect') || name.includes('walletconnect') || type.includes('walletconnect')
  })
}

function resolveInjectedConnector(connectors, target) {
  const normalized = normalizeTarget(target)

  const named = connectors.find((connector) => {
    const id = (connector.id || '').toLowerCase()
    const name = (connector.name || '').toLowerCase()

    if (normalized === 'metamask') {
      return id.includes('metamask') || name.includes('metamask')
    }
    if (normalized === 'coinbase') {
      return id.includes('coinbase') || name.includes('coinbase')
    }
    return false
  })

  if (named) return named

  if (hasInjectedWallet(target)) {
    return connectors.find((connector) => (connector.id || '').toLowerCase() === 'injected')
  }

  return undefined
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

function buildWalletDappLink(target) {
  const url = window.location.href
  const normalized = normalizeTarget(target)

  if (normalized === 'metamask') {
    return `https://metamask.app.link/dapp/${encodeURIComponent(url)}`
  }
  if (normalized === 'coinbase') {
    return `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`
  }
  return null
}

/**
 * Opens the wallet app with this dapp (universal link).
 * Installed → native app; not installed → Play Store / App Store via the link provider.
 */
function openMobileWalletApp(target) {
  const dappLink = buildWalletDappLink(target)
  if (dappLink) {
    openMobileUrl(dappLink)
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

  if (hasInjectedWallet(target)) {
    const connector = resolveInjectedConnector(connectors, target)
    if (connector) {
      await connectAsync({ connector })
      return { status: 'connected' }
    }
  }

  openMobileWalletApp(target)
  return { status: 'redirected' }
}
