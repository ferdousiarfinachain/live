import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ConnectEmbed, useSwitchActiveWalletChain } from 'thirdweb/react'
import { lockBodyScroll, unlockBodyScroll } from './bodyScrollLock'
import {
  appChains,
  appMetadata,
  defaultChain,
  supportedWallets,
  thirdwebClient,
} from './thirdwebClient'
import './ConnectWalletModal.css'

export const MODAL_CLOSE_MS = 520

const METAMASK_DOWNLOAD_URL =
  import.meta.env.VITE_METAMASK_DOWNLOAD_URL || 'https://metamask.io/download/'

export default function ConnectWalletModal({ isOpen, onClose, onNoWallet }) {
  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef(null)
  const switchChain = useSwitchActiveWalletChain()
  const visible = isOpen || isClosing

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
  }, [visible])

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
  }, [])

  function beginClose() {
    if (!isOpen || isClosing) return
    setIsClosing(true)
    closeTimerRef.current = window.setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, MODAL_CLOSE_MS)
  }

  if (!visible) return null

  return createPortal(
    <div
      className={`wallet-modal-backdrop ${isClosing ? 'wallet-modal-backdrop--closing' : ''}`}
      onClick={beginClose}
      role="presentation"
    >
      <div
        className={`wallet-modal wallet-modal--thirdweb ${isClosing ? 'wallet-modal--closing' : ''}`}
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

        {!thirdwebClient ? (
          <div className="wallet-modal-setup">
            <h2 className="wallet-modal-title">Setup required</h2>
            <p className="wallet-modal-setup-text">
              Add your thirdweb <strong>Client ID</strong> to <code>.env</code>:
            </p>
            <pre className="wallet-modal-setup-code">VITE_THIRDWEB_CLIENT_ID=your_client_id</pre>
            <p className="wallet-modal-setup-text">
              Create one free at{' '}
              <a href="https://thirdweb.com/dashboard" target="_blank" rel="noopener noreferrer">
                thirdweb.com/dashboard
              </a>
              , then restart <code>npm run dev</code>.
            </p>
          </div>
        ) : (
          <>
            <div className="wallet-modal-header-copy">
              <h2 className="wallet-modal-title">Connect Wallet</h2>
              <p className="wallet-modal-subtitle">
                If you already have a wallet, select it from the options below. If you don&apos;t
                have a wallet, download{' '}
                <a
                  href={METAMASK_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wallet-modal-link"
                >
                  MetaMask
                </a>{' '}
                to get started.
              </p>
            </div>
            <ConnectEmbed
              client={thirdwebClient}
              wallets={supportedWallets}
              chains={appChains}
              chain={defaultChain}
              appMetadata={appMetadata}
              theme="dark"
              className="wallet-modal-thirdweb"
              showThirdwebBranding={false}
              onConnect={async () => {
                try {
                  await switchChain(defaultChain)
                } catch {
                  /* user can approve later via auto-switch */
                }
                beginClose()
              }}
            />
          </>
        )}

        <button
          type="button"
          className="wallet-modal-footer-btn"
          onClick={() => {
            beginClose()
            onNoWallet?.()
          }}
        >
          I don&apos;t have a wallet
        </button>
      </div>
    </div>,
    document.body,
  )
}
