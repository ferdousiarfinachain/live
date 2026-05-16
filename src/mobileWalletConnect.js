import { bsc, mainnet } from 'viem/chains'

const MOBILE_CHAIN_IDS = [mainnet.id, bsc.id]

const MOBILE_WALLET_WC_LINKS = {
  metaMask: (uri) => `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`,
  coinbase: (uri) => `https://go.cb-w.com/wc?uri=${encodeURIComponent(uri)}`,
}

const MOBILE_STORE_LINKS = {
  metaMask: {
    android: 'https://play.google.com/store/apps/details?id=io.metamask',
    ios: 'https://apps.apple.com/app/metamask/id1438144200',
  },
  coinbase: {
    android: 'https://play.google.com/store/apps/details?id=org.toshi',
    ios: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
  },
}

const MOBILE_WALLET_DOWNLOAD = {
  metaMask:
    import.meta.env.VITE_METAMASK_DOWNLOAD_URL || 'https://metamask.io/download/',
  coinbase:
    import.meta.env.VITE_COINBASE_WALLET_DOWNLOAD_URL ||
    'https://www.coinbase.com/wallet/downloads',
  walletConnect:
    import.meta.env.VITE_WALLETCONNECT_INFO_URL || 'https://walletconnect.com/explorer',
}

const APP_NAME = 'Novex Labs'
const APP_LOGO_URL = 'https://walletconnect.com/walletconnect-logo.png'

export function isMobileDevice() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
}

function normalizeTarget(target) {
  return `${target || ''}`.toLowerCase()
}

function getWalletConnectProjectId() {
  return (
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ||
    import.meta.env.VITE_PROJECT_ID ||
    ''
  )
    .toString()
    .trim()
}

function getWalletMetadata() {
  return {
    name: APP_NAME,
    description: 'Connect your wallet to Novex Labs',
    url:
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost:5173',
    icons: [APP_LOGO_URL],
  }
}

function getStoreUrl(targetKey) {
  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent || '')
  const links = MOBILE_STORE_LINKS[targetKey]
  if (!links) return MOBILE_WALLET_DOWNLOAD[targetKey]
  return isIos ? links.ios : links.android
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
    if (normalized === 'coinbase') {
      return id.includes('coinbase') || name.includes('coinbase')
    }
    return false
  })
}

function resolveCoinbaseConnector(connectors) {
  return connectors.find((connector) => {
    const id = (connector.id || '').toLowerCase()
    const name = (connector.name || '').toLowerCase()
    return id.includes('coinbase') || name.includes('coinbase')
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

/** If the wallet app does not open, send the user to the app store. */
function openWalletAppOrStore(appUrl, storeUrl, waitMs = 2600) {
  const startedAt = Date.now()
  let fallbackTimerId = null

  const clearFallback = () => {
    if (fallbackTimerId !== null) {
      window.clearTimeout(fallbackTimerId)
      fallbackTimerId = null
    }
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      clearFallback()
    }
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  openMobileUrl(appUrl)

  fallbackTimerId = window.setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    if (document.visibilityState === 'visible' && Date.now() - startedAt >= waitMs - 200) {
      openMobileUrl(storeUrl)
    }
  }, waitMs)

  return () => {
    clearFallback()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}

export function openMobileWalletDownload(target) {
  const normalized = normalizeTarget(target)
  if (normalized === 'metamask') {
    openMobileUrl(getStoreUrl('metaMask'))
    return
  }
  if (normalized === 'coinbase') {
    openMobileUrl(getStoreUrl('coinbase'))
    return
  }
  openMobileUrl(MOBILE_WALLET_DOWNLOAD.walletConnect)
}

async function connectWithWalletDeepLink({ target, connectAsync, connectors }) {
  const normalized = normalizeTarget(target)
  const walletKey = normalized === 'metamask' ? 'metaMask' : 'coinbase'
  const projectId = getWalletConnectProjectId()
  const wagmiWalletConnect = resolveWalletConnectConnector(connectors)

  if (!projectId || !wagmiWalletConnect) {
    return { status: 'fallback', target }
  }

  const buildWcLink = MOBILE_WALLET_WC_LINKS[walletKey]
  const storeUrl = getStoreUrl(walletKey)

  const { EthereumProvider } = await import('@walletconnect/ethereum-provider')
  const provider = await EthereumProvider.init({
    projectId,
    showQrModal: false,
    metadata: getWalletMetadata(),
    optionalChains: MOBILE_CHAIN_IDS,
  })

  let cleanupStoreFallback = () => {}

  try {
    await new Promise((resolve, reject) => {
      const onDisplayUri = (uri) => {
        if (!uri) return
        cleanupStoreFallback()
        cleanupStoreFallback = openWalletAppOrStore(buildWcLink(uri), storeUrl)
      }

      provider.on('display_uri', onDisplayUri)

      provider
        .connect()
        .then(() => {
          provider.removeListener('display_uri', onDisplayUri)
          resolve()
        })
        .catch((error) => {
          provider.removeListener('display_uri', onDisplayUri)
          reject(error)
        })
    })

    await provider.enable()
    await connectAsync({ connector: wagmiWalletConnect })
    return { status: 'connected' }
  } finally {
    cleanupStoreFallback()
  }
}

/**
 * Mobile-only wallet connect.
 * - WalletConnect button: unchanged (uses wagmi WalletConnect + modal).
 * - MetaMask / Coinbase: deep link to app, Play Store / App Store if not installed.
 */
export async function connectMobileWallet({ target, connectAsync, connectors }) {
  const normalized = normalizeTarget(target)

  if (normalized === 'walletconnect') {
    const walletConnectConnector = resolveWalletConnectConnector(connectors)
    if (!walletConnectConnector) {
      return { status: 'fallback', target: 'walletConnect' }
    }
    await connectAsync({ connector: walletConnectConnector })
    return { status: 'connected' }
  }

  if (normalized !== 'metamask' && normalized !== 'coinbase') {
    return { status: 'fallback', target }
  }

  if (hasInjectedWallet(target)) {
    const injectedConnector = resolveInjectedConnector(connectors, target)
    if (injectedConnector) {
      await connectAsync({ connector: injectedConnector })
      return { status: 'connected' }
    }
  }

  if (normalized === 'coinbase') {
    const coinbaseConnector = resolveCoinbaseConnector(connectors)
    if (coinbaseConnector) {
      try {
        await connectAsync({ connector: coinbaseConnector })
        return { status: 'connected' }
      } catch {
        // Fall through to WalletConnect deep link + store fallback.
      }
    }
  }

  try {
    return await connectWithWalletDeepLink({ target, connectAsync, connectors })
  } catch {
    return { status: 'fallback', target }
  }
}
