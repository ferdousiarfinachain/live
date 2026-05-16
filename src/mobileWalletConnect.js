const MOBILE_WALLET_DOWNLOAD = {
  metaMask:
    import.meta.env.VITE_METAMASK_DOWNLOAD_URL || 'https://metamask.io/download/',
  coinbase:
    import.meta.env.VITE_COINBASE_WALLET_DOWNLOAD_URL ||
    'https://www.coinbase.com/wallet/downloads',
  walletConnect:
    import.meta.env.VITE_WALLETCONNECT_INFO_URL || 'https://walletconnect.com/explorer',
}

const MOBILE_STORE_LINKS = {
  metaMask: {
    android: 'https://play.google.com/store/apps/details?id=io.metamask',
    ios: 'https://apps.apple.com/app/metamask/id1438144202',
  },
  coinbase: {
    android: 'https://play.google.com/store/apps/details?id=org.toshi',
    ios: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
  },
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

function resolveMetaMaskSdkConnector(connectors) {
  return connectors.find((connector) => {
    const id = (connector.id || '').toLowerCase()
    const type = (connector.type || '').toLowerCase()
    return id === 'metamasksdk' || type === 'metamask'
  })
}

function resolveCoinbaseConnector(connectors) {
  return connectors.find((connector) => {
    const id = (connector.id || '').toLowerCase()
    const name = (connector.name || '').toLowerCase()
    return id.includes('coinbase') || name.includes('coinbase')
  })
}

function resolveInjectedConnector(connectors, target) {
  const normalized = normalizeTarget(target)

  return connectors.find((connector) => {
    const id = (connector.id || '').toLowerCase()
    const name = (connector.name || '').toLowerCase()

    if (normalized === 'metamask') {
      return id === 'injected' && (name.includes('metamask') || name.includes('injected'))
    }
    if (normalized === 'coinbase') {
      return id.includes('coinbase') || name.includes('coinbase')
    }
    return false
  })
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

function getStoreOrDownloadUrl(target) {
  const key = normalizeTarget(target) === 'metamask' ? 'metaMask' : target
  const stores = MOBILE_STORE_LINKS[key]
  if (!stores) return MOBILE_WALLET_DOWNLOAD[key] || MOBILE_WALLET_DOWNLOAD.walletConnect

  const ua = navigator.userAgent || ''
  if (/Android/i.test(ua)) return stores.android
  if (/iPhone|iPad|iPod/i.test(ua)) return stores.ios
  return MOBILE_WALLET_DOWNLOAD[key] || MOBILE_WALLET_DOWNLOAD.walletConnect
}

export function openMobileWalletDownload(target) {
  openMobileUrl(getStoreOrDownloadUrl(target))
}

function isUserRejectedError(error) {
  if (!error) return false
  const message = `${error?.shortMessage || ''} ${error?.message || ''}`.toLowerCase()
  return (
    error?.name === 'UserRejectedRequestError' ||
    error?.code === 4001 ||
    message.includes('user rejected') ||
    message.includes('denied') ||
    message.includes('cancelled') ||
    message.includes('canceled')
  )
}

async function connectWithFallback({ connectAsync, connector, target }) {
  try {
    await connectAsync({ connector })
    return { status: 'connected' }
  } catch (error) {
    if (isUserRejectedError(error)) throw error
    return { status: 'fallback', target }
  }
}

/**
 * Mobile-only wallet connect.
 * - MetaMask / Coinbase: open installed app via native SDK / connector; else app store.
 * - WalletConnect: unchanged (uses WalletConnect modal).
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

  if (normalized === 'metamask') {
    if (hasInjectedWallet('metaMask')) {
      const injectedConnector = resolveInjectedConnector(connectors, 'metaMask')
      if (injectedConnector) {
        return connectWithFallback({ connectAsync, connector: injectedConnector, target: 'metaMask' })
      }
    }

    const metaMaskConnector = resolveMetaMaskSdkConnector(connectors)
    if (metaMaskConnector) {
      return connectWithFallback({ connectAsync, connector: metaMaskConnector, target: 'metaMask' })
    }

    return { status: 'fallback', target: 'metaMask' }
  }

  if (normalized === 'coinbase') {
    if (hasInjectedWallet('coinbase')) {
      const injectedConnector = resolveInjectedConnector(connectors, 'coinbase')
      if (injectedConnector) {
        return connectWithFallback({ connectAsync, connector: injectedConnector, target: 'coinbase' })
      }
    }

    const coinbaseConnector = resolveCoinbaseConnector(connectors)
    if (coinbaseConnector) {
      return connectWithFallback({ connectAsync, connector: coinbaseConnector, target: 'coinbase' })
    }

    return { status: 'fallback', target: 'coinbase' }
  }

  return { status: 'fallback', target }
}
