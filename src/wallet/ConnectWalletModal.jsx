import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAppKit, useAppKitState } from '@reown/appkit/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { defaultChain, isWalletConfigured } from './walletMetadata.js'
import { clearRecentWallets } from './walletRecentSanitize.js'
import { openReownMetaMaskDownloads } from './reownAppKit.js'
import './ConnectWalletModal.css'

export const MODAL_CLOSE_MS = 520

function ReownConnectOpener({ isOpen, onClose }) {
  const { open, close } = useAppKit()
  const { open: appKitOpen } = useAppKitState()
  const { isConnected } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const onCloseRef = useRef(onClose)
  const prevIsOpenRef = useRef(false)
  const prevAppKitOpenRef = useRef(false)
  const openedThisSessionRef = useRef(false)

  onCloseRef.current = onClose

  useEffect(() => {
    const wasParentOpen = prevIsOpenRef.current
    prevIsOpenRef.current = isOpen

    if (!isOpen) {
      openedThisSessionRef.current = false
      return
    }

    if (isConnected || openedThisSessionRef.current) {
      return
    }

    if (!wasParentOpen) {
      openedThisSessionRef.current = true
      clearRecentWallets()
      open({ view: 'Connect' }).catch(() => {
        openedThisSessionRef.current = false
        onCloseRef.current()
      })
    }
  }, [isConnected, isOpen, open])

  useEffect(() => {
    if (!isOpen || !isConnected) {
      return
    }

    if (switchChainAsync) {
      switchChainAsync({ chainId: defaultChain.id }).catch(() => {
        /* user can approve network switch later */
      })
    }

    openedThisSessionRef.current = false
  }, [isConnected, isOpen, switchChainAsync])

  useEffect(() => {
    const wasAppKitOpen = prevAppKitOpenRef.current
    prevAppKitOpenRef.current = appKitOpen

    if (!isOpen || isConnected || !openedThisSessionRef.current) {
      return
    }

    if (wasAppKitOpen && !appKitOpen) {
      openedThisSessionRef.current = false
      onCloseRef.current()
    }
  }, [appKitOpen, isConnected, isOpen])

  useEffect(() => {
    if (isOpen) {
      return undefined
    }

    if (!appKitOpen) {
      return undefined
    }

    close().catch(() => {})
    openedThisSessionRef.current = false
    return undefined
  }, [appKitOpen, close, isOpen])

  return null
}

export default function ConnectWalletModal({ isOpen, onClose }) {
  const { isConnected } = useAccount()
  const { close } = useAppKit()
  const prevConnectedRef = useRef(isConnected)

  // Parent sets isOpen=false before ReownConnectOpener can — otherwise disconnect reopens the modal.
  useEffect(() => {
    if (!isConnected) {
      return
    }
    close().catch(() => {})
    if (isOpen) {
      onClose()
    }
  }, [close, isConnected, isOpen, onClose])

  useEffect(() => {
    const wasConnected = prevConnectedRef.current
    prevConnectedRef.current = isConnected

    if (wasConnected && !isConnected) {
      close().catch(() => {})
    }
  }, [close, isConnected])

  if (!isOpen || isConnected) {
    return null
  }

  if (isWalletConfigured) {
    return <ReownConnectOpener isOpen={isOpen} onClose={onClose} />
  }

  return createPortal(
    <div className="wallet-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="wallet-modal wallet-modal--connect"
        role="dialog"
        aria-modal="true"
        aria-label="Connect wallet setup"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="wallet-modal-close"
          onClick={onClose}
          aria-label="Close connect wallet setup"
        >
          ×
        </button>
        <div className="wallet-modal-setup">
          <h2 className="wallet-modal-title">Setup required</h2>
          <p className="wallet-modal-setup-text">
            Add your Reown <strong>Project ID</strong> to <code>.env</code>:
          </p>
          <pre className="wallet-modal-setup-code">VITE_REOWN_PROJECT_ID=your_project_id</pre>
          <p className="wallet-modal-setup-text">
            Create one free at{' '}
            <a href="https://cloud.reown.com" target="_blank" rel="noopener noreferrer">
              cloud.reown.com
            </a>
            , then restart <code>npm run dev</code>.
          </p>
        </div>
        <button
          type="button"
          className="wallet-modal-footer-btn"
          onClick={() => {
            void openReownMetaMaskDownloads()
          }}
        >
          I don&apos;t have a wallet
        </button>
      </div>
    </div>,
    document.body,
  )
}
