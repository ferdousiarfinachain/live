import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useConnect } from 'wagmi'
import { lockBodyScroll, unlockBodyScroll } from './bodyScrollLock'
import {
  attachWalletConnectDisplayUriDeepLink,
  coinbaseWalletDappLink,
  getMobileBrowserSupportReason,
  isCoarseMobile,
  isCoinbaseWalletInjected,
  isMetaMaskInjected,
  isTrustWalletInjected,
  metaMaskDappUniversalLink,
  trustWalletOpenUrlLink,
} from './walletMobile'
import './ConnectWalletModal.css'

const MODAL_CLOSE_MS = 520

const FALLBACK_LINKS = {
  metaMask:
    import.meta.env.VITE_METAMASK_DOWNLOAD_URL || 'https://metamask.io/download/',
  trustWallet:
    import.meta.env.VITE_TRUSTWALLET_DOWNLOAD_URL || 'https://trustwallet.com/download',
  walletConnect:
    import.meta.env.VITE_WALLETCONNECT_INFO_URL || 'https://walletconnect.com/explorer',
  coinbase:
    import.meta.env.VITE_COINBASE_WALLET_DOWNLOAD_URL ||
    'https://www.coinbase.com/wallet/downloads',
}

const WALLET_ROWS = [
  {
    key: 'metaMask',
    label: 'MetaMask',
    logo: 'https://avatars.githubusercontent.com/u/11744586?s=200&v=4',
  },
  {
    key: 'trustWallet',
    label: 'Trust Wallet',
    logo: 'https://trustwallet.com/assets/images/media/assets/TWT.png',
  },
  {
    key: 'walletConnect',
    label: 'WalletConnect',
    logo: 'https://avatars.githubusercontent.com/u/37784886?s=200&v=4',
  },
  {
    key: 'coinbase',
    label: 'Coinbase Wallet',
    logo: 'https://avatars.githubusercontent.com/u/1885080?s=200&v=4',
  },
]

const BROWSER_HINT_COPY = {
  'instagram-facebook':
    'This in-app browser often blocks wallets. Open this page in Safari or Chrome, then connect again.',
  line: 'Line’s in-app browser may block WalletConnect. Open in Safari or Chrome for a reliable connection.',
  tiktok: 'TikTok’s in-app browser may block wallets. Open in Safari or Chrome, then try again.',
}

function isRejectedError(error) {
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

function openCenteredPopup(url, title) {
  const width = 520
  const height = 760
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2))
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2))
  window.open(
    url,
    title,
    `popup=yes,width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`,
  )
}

function openWalletConnectPage(url) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  anchor.click()
}

function resolveConnector(connectors, target) {
  const normalized = target.toLowerCase()

  return connectors.find((connector) => {
    const id = (connector.id || '').toLowerCase()
    const name = (connector.name || '').toLowerCase()
    const type = (connector.type || '').toLowerCase()

    if (normalized === 'walletconnect') {
      return id.includes('walletconnect') || name.includes('walletconnect') || type.includes('walletconnect')
    }
    if (normalized === 'coinbase') {
      return id.includes('coinbase') || name.includes('coinbase')
    }
    if (normalized === 'trustwallet') {
      return id.includes('trust') || name.includes('trust')
    }
    if (normalized === 'metamask') {
      return id.includes('metamask') || name.includes('metamask')
    }
    return false
  })
}

export default function ConnectWalletModal({ isOpen, onClose, onNoWallet }) {
  const [isClosing, setIsClosing] = useState(false)
  const requestInFlightRef = useRef(false)
  const closeTimerRef = useRef(null)
  const {
    connectAsync,
    connectors,
    isPending,
    error,
    reset,
    variables,
  } = useConnect()

  const activeConnectorId = variables?.connector?.id
  const visible = isOpen || isClosing

  const mobileBrowserReason = useMemo(
    () => (typeof window !== 'undefined' && isCoarseMobile() ? getMobileBrowserSupportReason() : null),
    [],
  )

  const errorMessage = useMemo(() => {
    if (!error) return ''
    return error.shortMessage || error.message || 'Wallet connection failed.'
  }, [error])

  const beginClose = useCallback(() => {
    if (!isOpen || isClosing) return
    setIsClosing(true)
    closeTimerRef.current = window.setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, MODAL_CLOSE_MS)
  }, [isOpen, isClosing, onClose])

  useLayoutEffect(() => {
    if (!visible) return undefined

    lockBodyScroll()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') beginClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      unlockBodyScroll()
    }
  }, [visible, beginClose])

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
  }, [])

  function openFallback(target) {
    const url = FALLBACK_LINKS[target]
    if (!url) return

    if (target === 'walletConnect') {
      openWalletConnectPage(url)
      return
    }

    openCenteredPopup(url, `${target}-wallet`)
  }

  async function runInjectedConnect(connector) {
    requestInFlightRef.current = true
    beginClose()
    try {
      await connectAsync({ connector })
    } catch (connectError) {
      const pendingMessage = `${connectError?.shortMessage || ''} ${connectError?.message || ''}`.toLowerCase()
      if (pendingMessage.includes('requestpermissions') && pendingMessage.includes('already pending')) {
        reset()
        return
      }
      if (isRejectedError(connectError)) {
        reset()
        return
      }
    } finally {
      requestInFlightRef.current = false
    }
  }

  async function handleWalletClick(target) {
    if (requestInFlightRef.current || isPending) return
    reset()

    const mobile = isCoarseMobile()
    const eth = typeof window !== 'undefined' ? window.ethereum : undefined
    const connector = resolveConnector(connectors, target)

    if (!connector) {
      beginClose()
      openFallback(target)
      return
    }

    if (target === 'metaMask') {
      if (isMetaMaskInjected(eth)) {
        await runInjectedConnect(connector)
        return
      }
      if (mobile) {
        beginClose()
        window.location.assign(metaMaskDappUniversalLink())
        return
      }
      beginClose()
      openFallback('metaMask')
      return
    }

    if (target === 'trustWallet') {
      if (isTrustWalletInjected(eth)) {
        await runInjectedConnect(connector)
        return
      }
      if (mobile) {
        beginClose()
        window.location.assign(trustWalletOpenUrlLink())
        return
      }
      beginClose()
      openFallback('trustWallet')
      return
    }

    if (target === 'coinbase') {
      if (isCoinbaseWalletInjected(eth)) {
        await runInjectedConnect(connector)
        return
      }
      if (mobile) {
        beginClose()
        window.location.assign(coinbaseWalletDappLink())
        return
      }
      beginClose()
      openCenteredPopup(FALLBACK_LINKS.coinbase, 'coinbase-wallet')
      return
    }

    if (target === 'walletConnect') {
      if (mobile) {
        let detachDisplayUri = () => {}
        try {
          requestInFlightRef.current = true
          beginClose()
          detachDisplayUri = await attachWalletConnectDisplayUriDeepLink(connector, 'walletConnect')
          await connectAsync({ connector })
        } catch (connectError) {
          const pendingMessage = `${connectError?.shortMessage || ''} ${connectError?.message || ''}`.toLowerCase()
          if (pendingMessage.includes('requestpermissions') && pendingMessage.includes('already pending')) {
            reset()
            return
          }
          if (isRejectedError(connectError)) {
            reset()
            return
          }
        } finally {
          detachDisplayUri()
          requestInFlightRef.current = false
        }
        return
      }

      try {
        requestInFlightRef.current = true
        beginClose()
        await connectAsync({ connector })
      } catch (connectError) {
        const pendingMessage = `${connectError?.shortMessage || ''} ${connectError?.message || ''}`.toLowerCase()
        if (pendingMessage.includes('requestpermissions') && pendingMessage.includes('already pending')) {
          reset()
          return
        }
        if (isRejectedError(connectError)) {
          reset()
          return
        }
      } finally {
        requestInFlightRef.current = false
      }
      return
    }
  }

  if (!visible) return null

  return createPortal(
    <div
      className={`wallet-modal-backdrop ${isClosing ? 'wallet-modal-backdrop--closing' : ''}`}
      onClick={beginClose}
      role="presentation"
    >
      <div
        className={`wallet-modal ${isClosing ? 'wallet-modal--closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Connect wallet"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="wallet-modal-close"
          onClick={beginClose}
          aria-label="Close connect wallet modal"
        >
          ×
        </button>

        <h2 className="wallet-modal-title">Connect Wallet</h2>

        {mobileBrowserReason && BROWSER_HINT_COPY[mobileBrowserReason] ? (
          <p className="wallet-modal-browser-hint" role="status">
            {BROWSER_HINT_COPY[mobileBrowserReason]}
          </p>
        ) : null}

        <p className="wallet-modal-subtitle">
          If you already have a wallet, select it from the options below. If you don&apos;t have a
          wallet, download{' '}
          <a
            href={FALLBACK_LINKS.metaMask}
            target="_blank"
            rel="noopener noreferrer"
            className="wallet-modal-link"
          >
            MetaMask
          </a>{' '}
          to get started.
        </p>

        <div className="wallet-modal-list">
          {WALLET_ROWS.map((wallet) => {
            const rowConnector = resolveConnector(connectors, wallet.key)
            const isActivePending =
              isPending &&
              rowConnector &&
              activeConnectorId &&
              rowConnector.id === activeConnectorId

            return (
              <button
                key={wallet.key}
                type="button"
                className="wallet-row"
                disabled={isPending}
                onClick={() => handleWalletClick(wallet.key)}
              >
                <span className="wallet-row-label">{wallet.label}</span>
                <span className="wallet-row-right">
                  <span className="wallet-row-icon" aria-hidden="true">
                    <img src={wallet.logo} alt="" loading="lazy" />
                  </span>
                  {isActivePending ? <span className="wallet-row-spinner" aria-hidden="true" /> : null}
                </span>
              </button>
            )
          })}
        </div>

        {errorMessage ? <p className="wallet-modal-error">{errorMessage}</p> : null}

        <button type="button" className="wallet-modal-footer-btn" onClick={() => {
          beginClose()
          onNoWallet?.()
        }}>
          I don&apos;t have a wallet
        </button>
      </div>
    </div>,
    document.body,
  )
}
