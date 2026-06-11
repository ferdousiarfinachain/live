import { createAppKit } from '@reown/appkit/react'
import { ModalController, OptionsController } from '@reown/appkit-controllers'
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

const patchedShadowRoots = new WeakSet()
let refreshScheduled = false

function injectHideStyles(root) {
  if (!root || patchedShadowRoots.has(root)) {
    return
  }

  patchedShadowRoots.add(root)

  if (!root.querySelector('[data-novex-ui-hides]')) {
    const hideStyle = document.createElement('style')
    hideStyle.setAttribute('data-novex-ui-hides', '')
    hideStyle.textContent = HIDE_UI_CSS
    root.appendChild(hideStyle)
  }

  root.querySelectorAll('*').forEach((node) => {
    if (node.shadowRoot) {
      injectHideStyles(node.shadowRoot)
    }
  })
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

      w3m-list-wallet[data-testid='wallet-selector-injected'],
      w3m-list-wallet[name='Browser Wallet'] {
        display: none !important;
      }
    `
    root.appendChild(style)
  }

  injectHideStyles(root)
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
          scheduleRefreshReownModalPatches()
          return
        }
      }
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })

  ModalController.subscribeKey('open', (isOpen) => {
    if (!isOpen) {
      return
    }
    scheduleRefreshReownModalPatches()
    setTimeout(scheduleRefreshReownModalPatches, 100)
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
