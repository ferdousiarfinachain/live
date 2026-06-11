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

function shouldHideWalletRow(element) {
  const testId = element.getAttribute('data-testid') ?? ''
  const name = element.getAttribute('name') ?? ''
  return (
    testId === 'wallet-selector-injected' ||
    testId === 'wallet-selector-walletconnect' ||
    name === 'Browser Wallet' ||
    name === 'WalletConnect'
  )
}

function hideUnwantedUiNodes(root) {
  root.querySelectorAll('w3m-list-wallet, wui-list-wallet, wui-ux-by-reown').forEach((node) => {
    if (node.tagName === 'WUI-UX-BY-REOWN' || shouldHideWalletRow(node)) {
      node.style.setProperty('display', 'none', 'important')
    }
  })

  root.querySelectorAll('*').forEach((node) => {
    if (node.shadowRoot) {
      patchShadowRoot(node.shadowRoot)
    }
  })
}

function patchShadowRoot(root) {
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

  hideUnwantedUiNodes(root)

  const observer = new MutationObserver(() => {
    hideUnwantedUiNodes(root)
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

      w3m-list-wallet[data-testid='wallet-selector-injected'],
      w3m-list-wallet[name='Browser Wallet'] {
        display: none !important;
      }
    `
    root.appendChild(style)
  }

  patchShadowRoot(root)
}

function refreshReownModalPatches() {
  if (typeof document === 'undefined') {
    return
  }
  document.querySelectorAll('w3m-modal').forEach(patchReownModal)
}

function installReownModalUiPatches() {
  if (typeof document === 'undefined') {
    return
  }

  refreshReownModalPatches()

  const observer = new MutationObserver(refreshReownModalPatches)
  observer.observe(document.body, { childList: true, subtree: true })

  ModalController.subscribeKey('open', (isOpen) => {
    if (isOpen) {
      refreshReownModalPatches()
      requestAnimationFrame(refreshReownModalPatches)
      setTimeout(refreshReownModalPatches, 0)
      setTimeout(refreshReownModalPatches, 100)
    }
  })
}

function disableReownBranding() {
  OptionsController.setRemoteFeatures({ reownBranding: false })
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
