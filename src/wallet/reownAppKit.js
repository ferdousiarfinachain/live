import { createAppKit } from '@reown/appkit/react'
import { ModalController, OptionsController, RouterController } from '@reown/appkit-controllers'
import { wagmiChains } from './chains.js'
import { WALLET_ORDER } from './Order.js'
import './reownModalOverrides.css'
import { sanitizeRecentWallets } from './walletRecentSanitize.js'
import { wagmiAdapter } from './wagmiConfig.js'
import { appMetadata, reownProjectId } from './walletMetadata.js'

export let appKitModal

const HIDE_UI_CSS = `
  w3m-list-wallet[data-testid='wallet-selector-walletconnect'],
  w3m-list-wallet[data-testid='wallet-selector-injected'],
  w3m-list-wallet[name='Browser Wallet'],
  w3m-list-wallet[name='WalletConnect'],
  wui-list-wallet[name='WalletConnect'],
  wui-list-wallet[name='Browser Wallet'],
  wui-ux-by-reown {
    display: none !important;
  }
`

const styledShadowRoots = new WeakSet()
const observedModalRoots = new WeakSet()
let refreshScheduled = false
let refreshTimers = []

function shouldHideWalletRow(element) {
  const testId = element.getAttribute('data-testid') ?? ''
  const name = element.getAttribute('name') ?? ''
  return (
    testId === 'wallet-selector-walletconnect' ||
    testId === 'wallet-selector-injected' ||
    name === 'WalletConnect' ||
    name === 'Browser Wallet'
  )
}

function ensureHideStyles(root) {
  if (!root || styledShadowRoots.has(root)) {
    return
  }

  styledShadowRoots.add(root)

  if (!root.querySelector('[data-novex-ui-hides]')) {
    const hideStyle = document.createElement('style')
    hideStyle.setAttribute('data-novex-ui-hides', '')
    hideStyle.textContent = HIDE_UI_CSS
    root.appendChild(hideStyle)
  }
}

function hideUnwantedWalletRows(root) {
  if (!root) {
    return
  }

  root.querySelectorAll('w3m-list-wallet, wui-list-wallet, wui-ux-by-reown').forEach((node) => {
    if (node.tagName === 'WUI-UX-BY-REOWN' || shouldHideWalletRow(node)) {
      node.style.setProperty('display', 'none', 'important')
    }
  })
}

function walkShadowTree(root) {
  if (!root) {
    return
  }

  ensureHideStyles(root)
  hideUnwantedWalletRows(root)

  root.querySelectorAll('*').forEach((node) => {
    if (node.shadowRoot) {
      walkShadowTree(node.shadowRoot)
    }
  })
}

function observeModalShadow(modal) {
  const root = modal.shadowRoot
  if (!root || observedModalRoots.has(root)) {
    return
  }

  observedModalRoots.add(root)

  const observer = new MutationObserver(() => {
    scheduleRefreshReownModalPatches()
  })
  observer.observe(root, { childList: true, subtree: true })
}

function patchReownModal(modal) {
  const root = modal.shadowRoot
  if (!root) {
    return
  }

  if (!root.querySelector('[data-novex-mobile-center]')) {
    const style = document.createElement('style')
    style.setAttribute('data-novex-mobile-center', '')
    style.textContent = `
      @media (max-width: 430px) {
        :host(:not([data-mobile-fullscreen='true'])) wui-flex {
          align-items: center !important;
          justify-content: center !important;
          padding: var(--apkt-spacing-4, 16px);
          box-sizing: border-box;
        }

        :host(:not([data-mobile-fullscreen='true'])) wui-card {
          border-bottom-left-radius: clamp(0px, var(--apkt-borderRadius-8), 44px) !important;
          border-bottom-right-radius: clamp(0px, var(--apkt-borderRadius-8), 44px) !important;
          width: 100%;
          max-width: min(100%, 360px);
          margin: 0 auto;
        }
      }

      w3m-list-wallet[data-testid='wallet-selector-walletconnect'],
      w3m-list-wallet[data-testid='wallet-selector-injected'],
      w3m-list-wallet[name='Browser Wallet'],
      w3m-list-wallet[name='WalletConnect'],
      wui-list-wallet[name='WalletConnect'],
      wui-ux-by-reown {
        display: none !important;
      }
    `
    root.appendChild(style)
  }

  walkShadowTree(root)
  observeModalShadow(modal)
}

function refreshReownModalPatches() {
  if (typeof document === 'undefined') {
    return
  }
  document.querySelectorAll('w3m-modal').forEach(patchReownModal)
}

function scheduleRefreshReownModalPatches() {
  if (refreshScheduled || typeof document === 'undefined') {
    return
  }
  refreshScheduled = true
  requestAnimationFrame(() => {
    refreshScheduled = false
    refreshReownModalPatches()
  })
}

function scheduleModalOpenRefreshes() {
  refreshTimers.forEach((timer) => window.clearTimeout(timer))
  refreshTimers = []

  scheduleRefreshReownModalPatches()
  refreshTimers.push(window.setTimeout(scheduleRefreshReownModalPatches, 0))
  refreshTimers.push(window.setTimeout(scheduleRefreshReownModalPatches, 50))
  refreshTimers.push(window.setTimeout(scheduleRefreshReownModalPatches, 150))
  refreshTimers.push(window.setTimeout(scheduleRefreshReownModalPatches, 350))
}

function installReownModalUiPatches() {
  if (typeof document === 'undefined') {
    return
  }

  refreshReownModalPatches()

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          continue
        }
        if (node.localName === 'w3m-modal' || node.querySelector?.('w3m-modal')) {
          scheduleModalOpenRefreshes()
          return
        }
      }
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })

  ModalController.subscribeKey('open', (isOpen) => {
    if (isOpen) {
      scheduleModalOpenRefreshes()
    }
  })

  RouterController.subscribeKey('view', (view) => {
    if (view === 'Connect' && ModalController.state.open) {
      scheduleModalOpenRefreshes()
    }
  })
}

function disableReownBranding() {
  if (OptionsController.state.remoteFeatures?.reownBranding) {
    OptionsController.setRemoteFeatures({ reownBranding: false })
  }
}

if (reownProjectId) {
  sanitizeRecentWallets(WALLET_ORDER)
  installReownModalUiPatches()

  appKitModal = createAppKit({
    adapters: [wagmiAdapter],
    networks: wagmiChains,
    projectId: reownProjectId,
    metadata: appMetadata,
    themeMode: 'dark',
    featuredWalletIds: WALLET_ORDER,
    allWallets: 'SHOW',
    showWallets: true,
    enableInjected: false,
    enableEIP6963: true,
    enableCoinbase: true,
    enableBaseAccount: false,
    features: {
      analytics: false,
      email: false,
      socials: false,
      allWallets: true,
      reownBranding: false,
      connectorTypeOrder: ['injected', 'featured', 'external', 'recommended'],
    },
  })

  disableReownBranding()
  OptionsController.subscribeKey('remoteFeatures', disableReownBranding)
}
