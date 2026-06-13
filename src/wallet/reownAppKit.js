import { createAppKit } from '@reown/appkit/react'
import { ApiController, ChainController, ModalController, OptionsController, RouterController } from '@reown/appkit-controllers'
import { wagmiChains } from './chains.js'
import { WALLET_NAMES, WALLET_ORDER, WALLET_SELECTOR_TEST_IDS } from './Order.js'
import './reownModalOverrides.css'
import { clearRecentWallets, resetWalletConnectSession } from './walletRecentSanitize.js'
import { wagmiAdapter } from './wagmiConfig.js'
import { getAppMetadata, reownProjectId } from './walletMetadata.js'

export let appKitModal

let reownHandoffCloseTimer = null

const MODAL_HANDOFF_MS = 520
const MODAL_HANDOFF_EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)'
const REOWN_HANDOFF_CLOSE_CSS = `
  :host([data-novex-handoff-close]) {
    pointer-events: none !important;
    transition:
      opacity ${MODAL_HANDOFF_MS}ms ${MODAL_HANDOFF_EASE_OUT},
      backdrop-filter ${MODAL_HANDOFF_MS}ms ${MODAL_HANDOFF_EASE_OUT} !important;
  }

  :host([data-novex-handoff-close]) wui-card {
    transition:
      transform ${MODAL_HANDOFF_MS}ms ${MODAL_HANDOFF_EASE_OUT},
      opacity ${MODAL_HANDOFF_MS}ms ${MODAL_HANDOFF_EASE_OUT} !important;
  }

  :host([data-novex-handoff-close='active']) {
    opacity: 0 !important;
    backdrop-filter: blur(0px) !important;
  }

  :host([data-novex-handoff-close='active']) wui-card {
    transform: translateY(10px) scale(0.97) !important;
    opacity: 0 !important;
  }
`

export function cancelReownConnectHandoffClose() {
  if (reownHandoffCloseTimer) {
    window.clearTimeout(reownHandoffCloseTimer)
    reownHandoffCloseTimer = null
  }

  document.querySelectorAll('w3m-modal').forEach((modal) => {
    modal.removeAttribute('data-novex-handoff-close')
  })
}

const REOWN_UNDER_GUIDE_CSS = `
  :host {
    z-index: 11900 !important;
    pointer-events: none !important;
    transition: none !important;
  }
`

export function pushReownBelowGuide() {
  document.querySelectorAll('w3m-modal').forEach((modal) => {
    modal.setAttribute('data-novex-under-guide', '')
    modal.style.setProperty('z-index', '11900', 'important')
    modal.style.setProperty('pointer-events', 'none', 'important')
    if (modal.shadowRoot) {
      injectShadowStyle(modal.shadowRoot, 'data-novex-under-guide', REOWN_UNDER_GUIDE_CSS)
    }
  })
}

export function restoreReownFromGuide() {
  document.querySelectorAll('w3m-modal').forEach((modal) => {
    modal.removeAttribute('data-novex-under-guide')
    modal.style.removeProperty('z-index')
    modal.style.removeProperty('pointer-events')
    modal.shadowRoot?.querySelector('style[data-novex-under-guide]')?.remove()
  })
}

export function closeReownConnectModal() {
  cancelReownConnectHandoffClose()
  removeAllNoWalletFooters()
  restoreReownFromGuide()
  return ModalController.close().catch(() => {})
}

export function closeReownModalForGuideHandoff() {
  return closeReownConnectModal()
}

const METAMASK_DOWNLOAD_URL =
  import.meta.env.VITE_METAMASK_DOWNLOAD_URL || 'https://metamask.io/download/'

const METAMASK_WALLET_ID = WALLET_ORDER[0]

const FALLBACK_METAMASK_WALLET = {
  id: METAMASK_WALLET_ID,
  name: 'MetaMask',
  homepage: METAMASK_DOWNLOAD_URL,
  chrome_store:
    'https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
  app_store: 'https://apps.apple.com/app/metamask-blockchain-wallet/id1438144202',
  play_store: 'https://play.google.com/store/apps/details?id=io.metamask',
}

let cachedMetaMaskWallet = null
let downloadsStylePassTimer = null
let muteModalPatchObserver = false

// Reown router slide duration (see w3m-router-container transitionDuration).
const ROUTER_TRANSITION_MS = 160

async function resolveMetaMaskWallet({ force = false } = {}) {
  if (!reownProjectId) {
    return FALLBACK_METAMASK_WALLET
  }

  if (!force && cachedMetaMaskWallet) {
    return cachedMetaMaskWallet
  }

  await ApiController.prefetch()

  const lists = [
    ApiController.state.featured,
    ApiController.state.allFeatured,
    ApiController.state.wallets,
    ApiController.state.recommended,
  ]

  for (const list of lists) {
    const wallet = list?.find((entry) => entry.id === METAMASK_WALLET_ID)
    if (wallet) {
      cachedMetaMaskWallet = wallet
      return wallet
    }
  }

  cachedMetaMaskWallet = FALLBACK_METAMASK_WALLET
  return cachedMetaMaskWallet
}

function prefetchMetaMaskWallet() {
  void resolveMetaMaskWallet()
}

function forEachModalRoot(callback) {
  if (typeof document === 'undefined') {
    return
  }

  document.querySelectorAll('w3m-modal').forEach((modal) => {
    const root = modal.shadowRoot
    if (root) {
      callback(root)
    }
  })
}

function muteModalPatchesBriefly() {
  muteModalPatchObserver = true
  suppressModalPatchesUntil = Date.now() + ROUTER_TRANSITION_MS
  window.setTimeout(() => {
    muteModalPatchObserver = false
  }, ROUTER_TRANSITION_MS)
}

function applyDownloadsViewStyles() {
  forEachModalRoot((root) => {
    applyPopupButtonStyles(root)
  })
}

function scheduleDownloadsStylePass(attempt = 0) {
  if (RouterController.state.view !== 'Downloads') {
    return
  }

  let hasItems = false

  forEachModalRoot((root) => {
    if (queryDeep(root, 'wui-list-item').length > 0) {
      hasItems = true
    }
  })

  if (hasItems) {
    applyDownloadsViewStyles()
    return
  }

  if (attempt >= 12) {
    return
  }

  if (downloadsStylePassTimer) {
    window.cancelAnimationFrame(downloadsStylePassTimer)
  }

  downloadsStylePassTimer = window.requestAnimationFrame(() => {
    downloadsStylePassTimer = null
    scheduleDownloadsStylePass(attempt + 1)
  })
}

function navigateToMetaMaskDownloads(wallet) {
  muteModalPatchesBriefly()

  const payload = { wallet }
  RouterController.push('Downloads', payload)

  if (RouterController.state.view !== 'Downloads') {
    RouterController.replace('Downloads', payload)
  }

  scheduleDownloadsStylePass()
  window.setTimeout(() => scheduleDownloadsStylePass(), ROUTER_TRANSITION_MS)
}

export function openReownMetaMaskDownloads() {
  if (!reownProjectId) {
    window.open(METAMASK_DOWNLOAD_URL, '_blank', 'noopener,noreferrer')
    return
  }

  const wallet = cachedMetaMaskWallet ?? FALLBACK_METAMASK_WALLET

  if (ModalController.state.open) {
    navigateToMetaMaskDownloads(wallet)
    void resolveMetaMaskWallet().then((resolvedWallet) => {
      if (resolvedWallet && resolvedWallet !== wallet) {
        RouterController.replace('Downloads', { wallet: resolvedWallet })
        scheduleDownloadsStylePass()
      }
    })
    return
  }

  void resolveMetaMaskWallet().then((resolvedWallet) => {
    const openDownloads = () =>
      ModalController.open({ view: 'Downloads', data: { wallet: resolvedWallet } })

    if (appKitModal?.open) {
      return appKitModal.open({ view: 'Downloads', data: { wallet: resolvedWallet } }).catch(openDownloads)
    }

    return openDownloads()
  })
}

if (typeof window !== 'undefined') {
  window.__novexOpenMetaMaskDownloads = (event) => {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    openReownMetaMaskDownloads()
  }
}

const MODAL_BORDER_RADIUS = '10px'
const WALLET_POPUP_BG = 'linear-gradient(180deg, #16161cfa 0%, #0c0c10fa 100%)'
const WALLET_POPUP_BORDER = '#363636'
const WALLET_INSTALLED_BG = 'rgba(48, 164, 107, 0.20)'
const WALLET_INSTALLED_COLOR = '#30A46B'

const HIDE_UI_CSS = `
  wui-ux-by-reown,
  wui-certified-switch,
  wui-icon-box[icon='qrCode'] {
    display: none !important;
  }
`

const MODAL_RADIUS_CSS = `
  :host {
    --apkt-borderRadius-8: ${MODAL_BORDER_RADIUS};
  }

  wui-card {
    border-radius: ${MODAL_BORDER_RADIUS} !important;
    background: ${WALLET_POPUP_BG} !important;
    background-color: #16161c !important;
    animation-name: fade-in !important;
    animation-duration: var(--apkt-duration-lg, 200ms) !important;
    animation-timing-function: cubic-bezier(0.23, 0.09, 0.08, 1.13) !important;
    animation-fill-mode: backwards !important;
  }

  :host([data-border='false']) wui-card,
  :host([data-border='true']) wui-card {
    animation-name: fade-in !important;
  }

  wui-card::before {
    border-radius: ${MODAL_BORDER_RADIUS} !important;
    background: transparent !important;
    box-shadow: inset 0 0 0 1px ${WALLET_POPUP_BORDER} !important;
  }

  w3m-header,
  w3m-header wui-flex,
  w3m-header wui-text,
  w3m-router,
  w3m-footer,
  w3m-connect-view,
  w3m-wallet-login-list,
  w3m-connector-list {
    background: transparent !important;
    background-color: transparent !important;
  }

  w3m-header {
    --local-header-background-color: transparent !important;
  }

  @media (max-width: 430px) {
    :host(:not([data-mobile-fullscreen='true'])) wui-flex {
      align-items: center !important;
      justify-content: center !important;
      padding: var(--apkt-spacing-4, 16px);
      box-sizing: border-box;
    }

    :host(:not([data-mobile-fullscreen='true'])) wui-card,
    :host(:not([data-mobile-fullscreen='true'])) wui-card:not([data-embedded='true']),
    :host(:not([data-mobile-fullscreen='true'])) wui-card::before {
      width: 100%;
      max-width: min(100%, 360px);
      margin: 0 auto;
      border-radius: ${MODAL_BORDER_RADIUS} !important;
      border-bottom-left-radius: ${MODAL_BORDER_RADIUS} !important;
      border-bottom-right-radius: ${MODAL_BORDER_RADIUS} !important;
    }
  }
`

const CONNECT_HINT_CSS = `
  w3m-router {
    position: relative !important;
    z-index: 0 !important;
  }

  [data-novex-wallet-hint] {
    display: block;
    margin: -12px 0 10px;
    padding: 0 18px 8px;
    text-align: center;
    font-family: Inter, system-ui, sans-serif;
    font-size: clamp(0.9rem, 1.2vw, 0.9rem);
    font-weight: 300;
    line-height: 1.5;
    color: rgb(233, 223, 223);
    position: relative;
    z-index: 100;
    isolation: isolate;
    pointer-events: auto;
  }

  [data-novex-metamask-hint-link] {
    display: inline;
    min-height: unset !important;
    max-height: unset !important;
    height: auto !important;
    padding: 0 !important;
    margin: 0;
    border: 0;
    background: none;
    font: inherit;
    color: #9bc4ff;
    font-weight: 400;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
    pointer-events: auto;
    position: relative;
    z-index: 101;
    touch-action: manipulation;
  }

  [data-novex-metamask-hint-link]:hover {
    color: #c9ddff;
  }
`

const CONNECT_WALLET_HINT_PREFIX =
  "If you already have a wallet, select it from the options below. If you don't have a wallet, download "
const CONNECT_WALLET_HINT_SUFFIX = ' to get started.'

let metaMaskHintNavigateLock = false

function onMetaMaskHintActivate(event) {
  event?.preventDefault?.()
  event?.stopPropagation?.()

  if (metaMaskHintNavigateLock) {
    return
  }

  metaMaskHintNavigateLock = true
  window.setTimeout(() => {
    metaMaskHintNavigateLock = false
  }, 400)

  openReownMetaMaskDownloads()
}

function isMetaMaskHintLinkTarget(event) {
  for (const node of event.composedPath?.() ?? []) {
    if (node instanceof Element && node.matches('[data-novex-metamask-hint-link]')) {
      return true
    }
  }

  return false
}

function stopMetaMaskHintEvent(event) {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

let metaMaskHintGlobalHandlerBound = false

function installMetaMaskHintGlobalHandler() {
  if (metaMaskHintGlobalHandlerBound || typeof document === 'undefined') {
    return
  }

  metaMaskHintGlobalHandlerBound = true

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!ModalController.state.open || !isMetaMaskHintLinkTarget(event)) {
        return
      }

      stopMetaMaskHintEvent(event)
      onMetaMaskHintActivate(event)
    },
    true,
  )
}

function syncConnectWalletHintContent(hint) {
  let link = hint.querySelector('[data-novex-metamask-hint-link]')

  if (!link) {
    hint.replaceChildren(
      document.createTextNode(CONNECT_WALLET_HINT_PREFIX),
      document.createElement('button'),
      document.createTextNode(CONNECT_WALLET_HINT_SUFFIX),
    )
    link = hint.querySelector('button')
    link.type = 'button'
    link.setAttribute('data-novex-metamask-hint-link', '')
    link.textContent = 'MetaMask'
  }

  wireMetaMaskHintLink(link)
}

function wireMetaMaskHintLink(link) {
  if (!link || link.dataset.novexHintWired === 'true') {
    return
  }

  link.dataset.novexHintWired = 'true'

  const activate = (event) => {
    stopMetaMaskHintEvent(event)
    onMetaMaskHintActivate(event)
  }

  link.addEventListener('pointerdown', activate, true)
  link.addEventListener('click', activate, true)
  link.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      activate(event)
    }
  })
}

const styledShadowRoots = new WeakSet()
const observedModalRoots = new WeakSet()
let refreshScheduled = false
let refreshTimers = []
let isPatchingReownModal = false
let suppressModalPatchesUntil = 0

function isSearchWalletRow(element) {
  const testId = element.getAttribute('data-testid') ?? ''
  const name = element.getAttribute('name') ?? ''
  return testId === 'all-wallets' || name === 'Search Wallet' || element.showAllWallets === true
}

function shouldHideWalletRow(element) {
  if (isSearchWalletRow(element)) {
    return false
  }

  const name = element.getAttribute('name') ?? ''
  if (name && WALLET_NAMES.has(name)) {
    return false
  }

  const testId = element.getAttribute('data-testid') ?? ''
  if (testId && WALLET_SELECTOR_TEST_IDS.has(testId)) {
    return false
  }

  // EIP6963 announced rows use connector.id in data-testid, not explorer wallet id.
  if (name || testId.startsWith('wallet-selector-')) {
    return true
  }

  return false
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

  const view = RouterController.state.view
  if (view !== 'Connect' && view !== 'ConnectWallets') {
    return
  }

  root.querySelectorAll('w3m-list-wallet, wui-list-wallet, wui-ux-by-reown').forEach((node) => {
    if (node.tagName === 'WUI-UX-BY-REOWN' || shouldHideWalletRow(node)) {
      node.style.setProperty('display', 'none', 'important')
    } else {
      node.style.removeProperty('display')
    }
  })

  root.querySelectorAll('wui-certified-switch, wui-icon-box[icon="qrCode"]').forEach((node) => {
    node.style.setProperty('display', 'none', 'important')
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

function ensureModalRadiusStyles(modalRoot) {
  if (!modalRoot) {
    return
  }

  let style = modalRoot.querySelector('[data-novex-modal-radius]')
  if (!style) {
    style = document.createElement('style')
    style.setAttribute('data-novex-modal-radius', '')
    modalRoot.appendChild(style)
  }
  style.textContent = `${MODAL_RADIUS_CSS}\n${HIDE_UI_CSS}\n${CONNECT_HINT_CSS}`
}

function removeNoWalletFootersIn(root) {
  if (!root) {
    return
  }

  queryDeep(root, '[data-novex-no-wallet]').forEach((element) => {
    element.remove()
  })
}

function removeAllNoWalletFooters() {
  if (typeof document !== 'undefined') {
    document.querySelectorAll('w3m-modal').forEach((modal) => {
      removeNoWalletFootersIn(modal.shadowRoot)
    })
  }
}

function injectConnectWalletHint(modalRoot) {
  if (!modalRoot) {
    return
  }

  const showHint = ['Connect', 'ConnectWallets'].includes(RouterController.state.view)

  modalRoot.querySelectorAll('[data-novex-wallet-hint]').forEach((element) => {
    if (!showHint) {
      element.remove()
    }
  })

  if (!showHint) {
    return
  }

  const header = modalRoot.querySelector('w3m-header')
  if (!header) {
    return
  }

  let hint = modalRoot.querySelector('[data-novex-wallet-hint]')
  if (!hint) {
    hint = document.createElement('div')
    hint.setAttribute('data-novex-wallet-hint', '')
    header.insertAdjacentElement('afterend', hint)
  }

  syncConnectWalletHintContent(hint)
}

function injectShadowStyle(shadowRoot, attr, cssText) {
  if (!shadowRoot) {
    return
  }

  let style = shadowRoot.querySelector(`[${attr}]`)
  if (!style) {
    style = document.createElement('style')
    style.setAttribute(attr, '')
    shadowRoot.appendChild(style)
  }
  style.textContent = cssText
}

function removeShadowStyle(shadowRoot, attr) {
  shadowRoot?.querySelector(`[${attr}]`)?.remove()
}

function queryDeep(root, selector) {
  const found = []

  function walk(node) {
    if (!node) {
      return
    }

    node.querySelectorAll(selector).forEach((element) => found.push(element))
    node.querySelectorAll('*').forEach((element) => {
      if (element.shadowRoot) {
        walk(element.shadowRoot)
      }
    })
  }

  walk(root)
  return found
}

const ROUTER_SURFACE_CSS = `
  .page,
  .page-content,
  .container {
    background: transparent !important;
    background-color: transparent !important;
  }
`

const CONNECT_SURFACE_CSS = `
  :host,
  .connect,
  .connect-methods,
  wui-flex {
    background: transparent !important;
    background-color: transparent !important;
  }
`

const CONNECT_COMPACT_CSS = `
  .connect {
    max-height: none !important;
    overflow-y: visible !important;
  }

  [data-testid='w3m-connect-scroll-view'] {
    padding-bottom: var(--apkt-spacing-4, 16px) !important;
  }
`

const CONNECT_LIST_BTN_HEIGHT = 55
const CONNECT_LIST_ICON_SIZE = 32

const POPUP_LIST_BTN_HEIGHT_CSS = `
  button {
    min-height: ${CONNECT_LIST_BTN_HEIGHT}px !important;
    max-height: ${CONNECT_LIST_BTN_HEIGHT}px !important;
    height: ${CONNECT_LIST_BTN_HEIGHT}px !important;
    padding: 12px !important;
    box-sizing: border-box !important;
    align-items: center !important;
  }
`

const POPUP_LIST_WALLET_HEIGHT_CSS = `
  ${POPUP_LIST_BTN_HEIGHT_CSS}

  :host {
    overflow: visible !important;
  }

  button {
    background-color: var(--apkt-tokens-theme-foregroundPrimary, #252525) !important;
    border-radius: var(--apkt-borderRadius-4, 16px) !important;
    column-gap: var(--apkt-spacing-2, 8px) !important;
    color: var(--apkt-tokens-theme-textPrimary, #ffffff) !important;
    transform: translateY(0) !important;
    box-shadow: none !important;
    transition:
      background-color var(--apkt-durations-lg, 200ms) var(--apkt-easings-ease-out-power-2, ease),
      transform var(--apkt-durations-lg, 200ms) cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow var(--apkt-durations-lg, 200ms) var(--apkt-easings-ease-out-power-2, ease) !important;
  }

  button:hover:enabled {
    background-color: #363636 !important;
    transform: translateY(-3px) !important;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.32) !important;
  }

  button:active:enabled {
    transform: translateY(-1px) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.24) !important;
  }

  button:focus-visible:enabled {
    background-color: #363636 !important;
    transform: translateY(-3px) !important;
    box-shadow:
      0 8px 20px rgba(0, 0, 0, 0.32),
      0 0 0 4px var(--apkt-tokens-core-foregroundAccent020, rgba(9, 136, 240, 0.2)) !important;
  }

  wui-wallet-image,
  wui-all-wallets-image {
    width: ${CONNECT_LIST_ICON_SIZE}px !important;
    height: ${CONNECT_LIST_ICON_SIZE}px !important;
    min-width: ${CONNECT_LIST_ICON_SIZE}px !important;
    min-height: ${CONNECT_LIST_ICON_SIZE}px !important;
    flex-shrink: 0 !important;
  }
`

const POPUP_LIST_ITEM_WALLET_MATCH_CSS = `
  :host([data-type='primary']) > button,
  :host([data-type='secondary']) > button,
  button {
    background-color: transparent !important;
    border-radius: var(--apkt-borderRadius-4, 16px) !important;
    column-gap: var(--apkt-spacing-2, 8px) !important;
    color: var(--apkt-tokens-theme-textPrimary, #ffffff) !important;
    transition:
      background-color var(--apkt-durations-lg, 200ms) var(--apkt-easings-ease-out-power-2, ease),
      transform var(--apkt-durations-lg, 200ms) var(--apkt-easings-ease-out-power-2, ease) !important;
  }

  button:hover:enabled {
    background-color: var(--apkt-tokens-theme-foregroundPrimary, #252525) !important;
  }

  button:focus-visible:enabled {
    background-color: var(--apkt-tokens-theme-foregroundPrimary, #252525) !important;
    box-shadow: 0 0 0 4px var(--apkt-tokens-core-foregroundAccent020, rgba(9, 136, 240, 0.2)) !important;
  }

  wui-text {
    color: inherit !important;
    text-transform: none !important;
  }

  wui-icon {
    color: var(--apkt-tokens-theme-iconDefault, #9a9a9a) !important;
  }

  wui-image {
    background-color: var(--apkt-tokens-theme-foregroundSecondary, #2a2a2a) !important;
    border-radius: var(--apkt-borderRadius-2, 8px) !important;
  }
`

const POPUP_LIST_ITEM_HEIGHT_CSS = `
  ${POPUP_LIST_BTN_HEIGHT_CSS}

  wui-image {
    width: ${CONNECT_LIST_ICON_SIZE}px !important;
    height: ${CONNECT_LIST_ICON_SIZE}px !important;
    min-width: ${CONNECT_LIST_ICON_SIZE}px !important;
    min-height: ${CONNECT_LIST_ICON_SIZE}px !important;
    flex-shrink: 0 !important;
  }

  wui-image wui-icon {
    width: 24px !important;
    height: 24px !important;
  }

  wui-text {
    font-size: 16px !important;
    line-height: 18px !important;
  }
`

const POPUP_LIST_ITEM_DOWNLOADS_CSS = `
  ${POPUP_LIST_ITEM_HEIGHT_CSS}
  ${POPUP_LIST_ITEM_WALLET_MATCH_CSS}
`

const SEARCH_WALLET_ICON_CSS = `
  :host {
    background-color: ${WALLET_INSTALLED_BG} !important;
  }

  wui-icon {
    color: ${WALLET_INSTALLED_COLOR} !important;
  }
`

const SEARCH_WALLET_TAG_CSS = `
  :host {
    background-color: ${WALLET_INSTALLED_BG} !important;
    color: ${WALLET_INSTALLED_COLOR} !important;
  }

  wui-text,
  wui-icon {
    color: ${WALLET_INSTALLED_COLOR} !important;
  }
`

function applySearchWalletAccentStyles(row) {
  if (!row?.shadowRoot) {
    return
  }

  row.shadowRoot.querySelectorAll('wui-wallet-image').forEach((walletImage) => {
    injectShadowStyle(walletImage.shadowRoot, 'data-novex-search-wallet-icon', SEARCH_WALLET_ICON_CSS)
  })

  row.shadowRoot.querySelectorAll('wui-tag').forEach((tag) => {
    tag.variant = 'success'
    tag.dataset.variant = 'success'
    injectShadowStyle(tag.shadowRoot, 'data-novex-search-wallet-tag', SEARCH_WALLET_TAG_CSS)
  })
}

function applyPopupButtonStyles(modalRoot) {
  const isDownloadsView = RouterController.state.view === 'Downloads'

  queryDeep(modalRoot, 'wui-list-wallet').forEach((item) => {
    if (item.shadowRoot) {
      removeShadowStyle(item.shadowRoot, 'data-novex-page-btn')
      removeShadowStyle(item.shadowRoot, 'data-novex-search-wallet-bg')
      injectShadowStyle(item.shadowRoot, 'data-novex-list-wallet-height', POPUP_LIST_WALLET_HEIGHT_CSS)
    }
  })

  queryDeep(modalRoot, 'wui-list-item').forEach((item) => {
    if (item.shadowRoot) {
      removeShadowStyle(item.shadowRoot, 'data-novex-page-btn')
      injectShadowStyle(
        item.shadowRoot,
        'data-novex-list-item-height',
        isDownloadsView ? POPUP_LIST_ITEM_DOWNLOADS_CSS : POPUP_LIST_ITEM_HEIGHT_CSS,
      )
    }
  })
}

function applySearchWalletRowStyles(modalRoot) {
  queryDeep(modalRoot, 'wui-list-wallet, w3m-list-wallet').forEach((row) => {
    if (!isSearchWalletRow(row)) {
      return
    }

    applySearchWalletAccentStyles(row)

    row.shadowRoot?.querySelectorAll('wui-list-wallet').forEach((innerRow) => {
      applySearchWalletAccentStyles(innerRow)
    })
  })
}

function applyModalHeaderTitleStyle(modalRoot) {
  if (!modalRoot) {
    return
  }

  const shouldEnlargeModalTitle = ['Connect', 'ConnectWallets', 'Downloads'].includes(
    RouterController.state.view,
  )

  queryDeep(modalRoot, 'w3m-header').forEach((header) => {
    header.shadowRoot?.querySelectorAll('[data-testid="w3m-header-text"]').forEach((titleEl) => {
      if (!titleEl.shadowRoot) {
        return
      }

      if (shouldEnlargeModalTitle) {
        injectShadowStyle(
          titleEl.shadowRoot,
          'data-novex-connect-title',
          `
            slot.wui-font-lg-regular {
              font-size: 1.25rem !important;
              font-weight: 400 !important;
            }
          `,
        )
        return
      }

      removeShadowStyle(titleEl.shadowRoot, 'data-novex-connect-title')
    })
  })
}

function applyTransparentModalSections(modalRoot) {
  if (!modalRoot) {
    return
  }

  queryDeep(modalRoot, 'w3m-header').forEach((header) => {
    header.style.setProperty('--local-header-background-color', 'transparent')
    injectShadowStyle(
      header.shadowRoot,
      'data-novex-header-bg',
      `
        :host > wui-flex,
        wui-text {
          background: transparent !important;
          background-color: transparent !important;
        }
      `,
    )
  })

  applyModalHeaderTitleStyle(modalRoot)

  queryDeep(modalRoot, 'w3m-router-container').forEach((router) => {
    injectShadowStyle(router.shadowRoot, 'data-novex-router-bg', ROUTER_SURFACE_CSS)
  })

  queryDeep(modalRoot, 'w3m-connect-view').forEach((connectView) => {
    injectShadowStyle(connectView.shadowRoot, 'data-novex-connect-bg', CONNECT_SURFACE_CSS)
    injectShadowStyle(connectView.shadowRoot, 'data-novex-connect-compact', CONNECT_COMPACT_CSS)
  })

  applyPopupButtonStyles(modalRoot)
  applySearchWalletRowStyles(modalRoot)
}

function applyModalBorderRadius(modal) {
  modal.style.setProperty('--apkt-borderRadius-8', MODAL_BORDER_RADIUS)

  const root = modal.shadowRoot
  if (!root) {
    return
  }

  ensureModalRadiusStyles(root)

  root.querySelectorAll('wui-card').forEach((card) => {
    card.style.setProperty('border-radius', MODAL_BORDER_RADIUS, 'important')
    card.style.setProperty('background', WALLET_POPUP_BG, 'important')
    card.style.setProperty('background-color', '#16161c', 'important')
    card.style.setProperty('overflow', 'hidden', 'important')

    const cardRoot = card.shadowRoot
    if (!cardRoot) {
      return
    }

    let cardStyle = cardRoot.querySelector('[data-novex-modal-radius]')
    if (!cardStyle) {
      cardStyle = document.createElement('style')
      cardStyle.setAttribute('data-novex-modal-radius', '')
      cardRoot.appendChild(cardStyle)
    }
    cardStyle.textContent = `:host { border-radius: ${MODAL_BORDER_RADIUS} !important; background: ${WALLET_POPUP_BG} !important; box-shadow: inset 0 0 0 1px ${WALLET_POPUP_BORDER} !important; overflow: hidden; }`
  })
}

function observeModalShadow(modal) {
  const root = modal.shadowRoot
  if (!root || observedModalRoots.has(root)) {
    return
  }

  observedModalRoots.add(root)

  const observer = new MutationObserver(() => {
    if (muteModalPatchObserver) {
      if (RouterController.state.view === 'Downloads') {
        scheduleDownloadsStylePass()
      }
      return
    }

    scheduleRefreshReownModalPatches()
  })
  observer.observe(root, { childList: true, subtree: true })
}

function patchReownModal(modal) {
  const root = modal.shadowRoot
  if (!root || isPatchingReownModal || Date.now() < suppressModalPatchesUntil) {
    return
  }

  isPatchingReownModal = true
  try {
    applyModalBorderRadius(modal)
    applyTransparentModalSections(root)
    injectConnectWalletHint(root)
    removeNoWalletFootersIn(root)
    walkShadowTree(root)
    observeModalShadow(modal)
  } finally {
    isPatchingReownModal = false
  }
}

function refreshReownModalPatches() {
  if (typeof document === 'undefined') {
    return
  }
  document.querySelectorAll('w3m-modal').forEach(patchReownModal)
}

function scheduleRefreshReownModalPatches() {
  if (refreshScheduled || typeof document === 'undefined' || muteModalPatchObserver) {
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

  installMetaMaskHintGlobalHandler()
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
      if (!ChainController.state.activeCaipAddress) {
        resetWalletConnectSession()
      } else {
        clearRecentWallets()
      }
      prefetchMetaMaskWallet()
      scheduleModalOpenRefreshes()
      return
    }

    cachedMetaMaskWallet = null
    removeAllNoWalletFooters()
  })

  RouterController.subscribeKey('view', (view) => {
    if (!ModalController.state.open) {
      removeAllNoWalletFooters()
      return
    }

    if (view === 'Downloads') {
      forEachModalRoot((root) => {
        injectConnectWalletHint(root)
        applyModalHeaderTitleStyle(root)
      })
      window.setTimeout(() => scheduleDownloadsStylePass(), ROUTER_TRANSITION_MS)
      return
    }

    forEachModalRoot((root) => injectConnectWalletHint(root))

    if (!muteModalPatchObserver) {
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
  clearRecentWallets()
  installReownModalUiPatches()

  appKitModal = createAppKit({
    adapters: [wagmiAdapter],
    networks: wagmiChains,
    projectId: reownProjectId,
    metadata: getAppMetadata(),
    themeMode: 'dark',
    featuredWalletIds: WALLET_ORDER,
    allWallets: 'SHOW',
    showWallets: true,
    enableInjected: false,
    enableEIP6963: true,
    enableCoinbase: false,
    enableBaseAccount: false,
    features: {
      analytics: false,
      email: false,
      socials: false,
      allWallets: true,
      reownBranding: false,
      connectorTypeOrder: ['injected', 'featured'],
    },
  })

  disableReownBranding()
  OptionsController.subscribeKey('remoteFeatures', disableReownBranding)
}
