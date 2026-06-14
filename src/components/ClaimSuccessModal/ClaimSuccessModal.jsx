import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ExternalLink } from 'lucide-react'
import { chainId, getExplorerTxUrl } from '../../contracts/config.js'
import { lockBodyScroll } from '../../wallet/bodyScrollLock'
import { MODAL_CLOSE_MS } from '../../wallet/ConnectWalletModal'
import './ClaimSuccessModal.css'

function shortHash(hash) {
  const value = String(hash ?? '').trim()
  if (value.length < 12) return value
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

export default function ClaimSuccessModal({
  isOpen,
  onClose,
  tokenSymbol = 'NOVEX',
  tokensClaimed = '',
  transactionHash = '',
}) {
  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef(null)
  const visible = isOpen || isClosing
  const explorerUrl = getExplorerTxUrl(chainId, transactionHash)
  const tokenLabel = tokenSymbol.replace(/^\$+/, '').toUpperCase()
  const tokenMoniker = `$${tokenLabel}`

  useLayoutEffect(() => {
    if (!visible) {
      return undefined
    }

    const releaseScroll = lockBodyScroll()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') beginClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      releaseScroll()
    }
  }, [visible])

  useEffect(
    () => () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    },
    [],
  )

  function beginClose() {
    if (!isOpen || isClosing) return
    setIsClosing(true)
    closeTimerRef.current = window.setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, MODAL_CLOSE_MS)
  }

  if (!visible) return null

  const claimedDisplay = tokensClaimed ? `${tokensClaimed} ${tokenMoniker}` : `0 ${tokenMoniker}`

  return createPortal(
    <div
      className={`claim-success-backdrop ${isClosing ? 'claim-success-backdrop--closing' : ''}`}
      onClick={beginClose}
      role="presentation"
    >
      <div
        className={`claim-success-modal ${isClosing ? 'claim-success-modal--closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Claim successful"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="claim-success-close"
          onClick={beginClose}
          aria-label="Close claim success modal"
        >
          ×
        </button>

        <div className="claim-success-hero" aria-hidden="true">
          <span className="claim-success-confetti claim-success-confetti--a" />
          <span className="claim-success-confetti claim-success-confetti--b" />
          <span className="claim-success-confetti claim-success-confetti--c" />
          <span className="claim-success-confetti claim-success-confetti--d" />
          <span className="claim-success-check-wrap">
            <span className="claim-success-check-glow" />
            <span className="claim-success-check">✓</span>
          </span>
        </div>

        <h2 className="claim-success-title">Claim Successful!</h2>
        <p className="claim-success-subtitle">
          Congratulations! You have successfully claimed your{' '}
          <span className="claim-success-subtitle__token">{tokenMoniker}</span> tokens.
        </p>

        <div className="claim-success-details">
          <div className="claim-success-token-row">
            <span className="claim-success-token-icon" aria-hidden="true">
              N
            </span>
            <div className="claim-success-token-copy">
              <span className="claim-success-token-copy__label">Tokens Claimed</span>
              <strong className="claim-success-token-copy__value">{claimedDisplay}</strong>
            </div>
          </div>

          <div className="claim-success-divider" role="separator" />

          <div className="claim-success-hash-row">
            <span className="claim-success-hash-row__label">Transaction Hash</span>
            {explorerUrl ? (
              <a
                className="claim-success-hash-row__link"
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {shortHash(transactionHash)}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            ) : (
              <span className="claim-success-hash-row__link">{shortHash(transactionHash) || '—'}</span>
            )}
          </div>
        </div>

        <p className="claim-success-status">
          <span className="claim-success-status__icon" aria-hidden="true">
            <Check size={12} strokeWidth={3} />
          </span>
          Your tokens have been sent to your wallet.
        </p>

        {explorerUrl ? (
          <a
            className="claim-success-explorer"
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on BscScan
          </a>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
