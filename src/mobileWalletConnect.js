const MOBILE_WALLET_DEEP_LINKS = {
  metaMask: (uri) => `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`,
  trustWallet: (uri) => `https://link.trustwallet.com/wc?uri=${encodeURIComponent(uri)}`,
  coinbase: (uri) => `https://go.cb-w.com/wc?uri=${encodeURIComponent(uri)}`,
}

const MOBILE_WALLET_DOWNLOAD = {
  metaMask:
    import.meta.env.VITE_METAMASK_DOWNLOAD_URL || 'https://metamask.io/download/',
  trustWallet:
    import.meta.env.VITE_TRUSTWALLET_DOWNLOAD_URL || 'https://trustwallet.com/download',
  coinbase:
    import.meta.env.VITE_COINBASE_WALLET_DOWNLOAD_URL ||
    'https://www.coinbase.com/wallet/downloads',
  walletConnect:
    import.meta.env.VITE_WALLETCONNECT_INFO_URL || 'https://walletconnect.com/explorer',
}

export function isMobileDevice() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
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

  return connectors.find((connector) => {
    const id = (connector.id || '').toLowerCase()
    const name = (connector.name || '').toLowerCase()

    if (normalized === 'metamask') {
      return id.includes('metamask') || name.includes('metamask')
    }
    if (normalized === 'trustwallet') {
      return id.includes('trust') || name.includes('trust')
    }
    if (normalized === 'coinbase') {
      return id.includes('coinbase') || name.includes('coinbase')
    }
    if (normalized === 'walletconnect') {
      return resolveWalletConnectConnector([connector])
    }
    return false
  })
}

export function hasInjectedWallet(target) {
  const eth = typeof window !== 'undefined' ? window.ethereum : null
  if (!eth) return false

  const normalized = normalizeTarget(target)
  if (normalized === 'metamask') return Boolean(eth.isMetaMask)
  if (normalized === 'trustwallet') return Boolean(eth.isTrust || eth.isTrustWallet)
  if (normalized === 'coinbase') return Boolean(eth.isCoinbaseWallet)
  return false
}

function openMobileUrl(url) {
  if (!url) return
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.rel = 'noopener noreferrer'
  anchor.click()
}

export function openMobileWalletDownload(target) {
  const key = normalizeTarget(target) === 'trustwallet' ? 'trustWallet' : target
  openMobileUrl(MOBILE_WALLET_DOWNLOAD[key] || MOBILE_WALLET_DOWNLOAD.walletConnect)
}

function attachWalletDeepLink(target, provider) {
  const normalized = normalizeTarget(target)
  const buildLink =
    normalized === 'metamask'
      ? MOBILE_WALLET_DEEP_LINKS.metaMask
      : normalized === 'trustwallet'
        ? MOBILE_WALLET_DEEP_LINKS.trustWallet
        : normalized === 'coinbase'
          ? MOBILE_WALLET_DEEP_LINKS.coinbase
          : null

  if (!buildLink || !provider?.on) return () => {}

  const onDisplayUri = (uri) => {
    if (!uri) return
    window.location.assign(buildLink(uri))
  }

  provider.on('display_uri', onDisplayUri)
  return () => {
    provider.removeListener?.('display_uri', onDisplayUri)
  }
}

/**
 * Mobile-only wallet connect: opens installed wallet apps via WalletConnect deep links.
 * Falls back to download URLs when WalletConnect is not configured.
 */
export async function connectMobileWallet({ target, connectAsync, connectors }) {
  const normalized = normalizeTarget(target)

  if (hasInjectedWallet(target)) {
    const injectedConnector = resolveInjectedConnector(connectors, target)
    if (injectedConnector) {
      await connectAsync({ connector: injectedConnector })
      return { status: 'connected' }
    }
  }

  const walletConnectConnector = resolveWalletConnectConnector(connectors)
  if (!walletConnectConnector) {
    return { status: 'fallback', target }
  }

  let detachUriListener = () => {}
  const shouldDeepLink =
    normalized === 'metamask' || normalized === 'trustwallet' || normalized === 'coinbase'

  try {
    if (shouldDeepLink && typeof walletConnectConnector.getProvider === 'function') {
      const provider = await walletConnectConnector.getProvider()
      detachUriListener = attachWalletDeepLink(target, provider)
    }

    await connectAsync({ connector: walletConnectConnector })
    return { status: 'connected' }
  } finally {
    detachUriListener()
  }
}
