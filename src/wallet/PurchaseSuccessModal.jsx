import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock, Copy, ExternalLink } from 'lucide-react'
import bnbLogo from 'cryptocurrency-icons/svg/color/bnb.svg'
import ethLogo from 'cryptocurrency-icons/svg/color/eth.svg'
import usdtLogo from 'cryptocurrency-icons/svg/color/usdt.svg'
import usdcLogo from 'cryptocurrency-icons/svg/color/usdc.svg'
import { chainId, getExplorerTxUrl } from '../contracts/config.js'
import { lockBodyScroll } from './bodyScrollLock'
import { MODAL_CLOSE_MS } from './ConnectWalletModal'
import './PurchaseSuccessModal.css'

const paymentLogos = {
  BNB: bnbLogo,
  ETH: ethLogo,
  USDT: usdtLogo,
  USDC: usdcLogo,
}

function shortHash(hash) {
  const value = String(hash ?? '').trim()
  if (value.length < 12) return value
  return `${value.slice(0, 6)}...${value.slice(-5)}`
}

export default function PurchaseSuccessModal({
  isOpen,
  onClose,
  tokenSymbol = 'NOVEX',
  tokensPurchased = '',
  amountPaid = '',
  paymentMethod = 'BNB',
  transactionHash = '',
  chainId: txChainId = chainId,
}) {
  const [isClosing, setIsClosing] = useState(false)
  const [copied, setCopied] = useState(false)
  const closeTimerRef = useRef(null)
  const visible = isOpen || isClosing
  const explorerUrl = getExplorerTxUrl(txChainId, transactionHash)
  const paymentLogo = paymentLogos[paymentMethod]

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

  useEffect(() => {
    if (!isOpen) {
      setCopied(false)
    }
  }, [isOpen])

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

  async function handleCopyHash() {
    if (!transactionHash) return
    try {
      await navigator.clipboard.writeText(transactionHash)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* ignore */
    }
  }

  if (!visible) return null

  const tokenLabel = tokenSymbol.replace(/^\$+/, '').toUpperCase()

  return createPortal(
    <div
      className={`purchase-success-backdrop ${isClosing ? 'purchase-success-backdrop--closing' : ''}`}
      onClick={beginClose}
      role="presentation"
    >
      <div
        className={`purchase-success-modal ${isClosing ? 'purchase-success-modal--closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Purchase successful"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="purchase-success-hero" aria-hidden="true">
          <span className="purchase-success-confetti purchase-success-confetti--a" />
          <span className="purchase-success-confetti purchase-success-confetti--b" />
          <span className="purchase-success-confetti purchase-success-confetti--c" />
          <span className="purchase-success-confetti purchase-success-confetti--d" />
          <span className="purchase-success-check-wrap">
            <span className="purchase-success-check-glow" />
            <span className="purchase-success-check">✓</span>
          </span>
        </div>

        <h2 className="purchase-success-title">Purchase Successful!</h2>
        <p className="purchase-success-subtitle">
          Congratulations! You have successfully purchased {tokenLabel} tokens.
        </p>

        <div className="purchase-success-details">
          <div className="purchase-success-row">
            <span className="purchase-success-row__icon purchase-success-row__icon--token">
              {tokenLabel.slice(0, 1)}
            </span>
            <span className="purchase-success-row__label">Tokens Purchased</span>
            <strong className="purchase-success-row__value purchase-success-row__value--token">
              {tokensPurchased || '—'} {tokenLabel}
            </strong>
          </div>

          <div className="purchase-success-row">
            <span className="purchase-success-row__icon">
              {paymentLogo ? <img src={paymentLogo} alt="" /> : paymentMethod.slice(0, 1)}
            </span>
            <span className="purchase-success-row__label">Amount Paid</span>
            <strong className="purchase-success-row__value purchase-success-row__value--paid">
              {amountPaid || '—'} {paymentMethod}
            </strong>
          </div>

          <div className="purchase-success-row purchase-success-row--hash">
            <span className="purchase-success-row__icon purchase-success-row__icon--hash">#</span>
            <span className="purchase-success-row__label">Transaction Hash</span>
            <span className="purchase-success-hash">
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                {shortHash(transactionHash)}
              </a>
              <button type="button" onClick={handleCopyHash} aria-label="Copy transaction hash">
                <Copy size={12} />
              </button>
              {copied ? <span className="purchase-success-copied">Copied</span> : null}
            </span>
          </div>
        </div>

        {explorerUrl ? (
          <a
            className="purchase-success-explorer"
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Blockchain Explorer
            <ExternalLink size={14} />
          </a>
        ) : null}

        <p className="purchase-success-note">
          <Clock size={14} aria-hidden="true" />
          It may take a few moments for your tokens to appear in your wallet.
        </p>

        <button type="button" className="purchase-success-done" onClick={beginClose}>
          Close
        </button>
      </div>
    </div>,
    document.body,
  )
}
