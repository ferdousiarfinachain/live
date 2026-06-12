import { useEffect, useMemo, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import './AboutFeaturesSection.css'
import CountdownTimer from './CountdownTimer'
import {
  getConfiguredTreasuryNetworks,
  isTreasuryRouteConfigured,
} from '../contracts/config.js'
import {
  getTreasuryQuoteNetworkKey,
  isTreasuryPaymentMethod,
  isTreasuryQuoteEnabled,
} from '../lib/paymentMethods.js'
import { usePresaleBuy, usePresaleQuote } from '../wallet/usePresaleBuy'
import { usePresaleClaim } from '../wallet/usePresaleClaim'
import { usePresaleStats } from '../wallet/usePresaleStats'
import { usePaymentBalance } from '../wallet/usePaymentBalance'
import { usePaymentChainSwitch } from '../wallet/usePaymentChainSwitch'
import { useTreasuryNetworkDetect } from '../wallet/useTreasuryNetworkDetect'
import PurchaseSuccessModal from '../wallet/PurchaseSuccessModal'
import ClaimSuccessModal from './ClaimSuccessModal'

const PRESALE_LISTING_PRICE_USD = 0.0023
const PRESALE_LISTING_PRICE_LABEL = '$0.0023'
const PRESALE_USD_GOAL = 1_000_000
const PRESALE_USD_RAISED = 2_211.26
const CLAIM_USD_RAISED = PRESALE_USD_RAISED

function formatCompactUsd(value) {
  if (!Number.isFinite(value) || value < 0) {
    return '$0'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}
const CLAIM_TOKEN_SYMBOL = 'NOVEX'
const CLAIM_PURCHASED_AMOUNT_FALLBACK = 0
import bnbLogo from 'cryptocurrency-icons/svg/color/bnb.svg'
import ethLogo from 'cryptocurrency-icons/svg/color/eth.svg'
import usdtLogo from 'cryptocurrency-icons/svg/color/usdt.svg'
import usdcLogo from 'cryptocurrency-icons/svg/color/usdc.svg'

const paymentMethods = [
  { logo: bnbLogo, name: 'BNB' },
  { logo: ethLogo, name: 'ETH' },
  { logo: usdtLogo, name: 'USDT' },
  { logo: usdcLogo, name: 'USDC' },
]

const heroHighlights = [
  {
    title: 'Multi-Chain Support',
    copy: 'Pay with BNB, ETH, USDT, or USDC on 7 popular networks.',
  },
  {
    title: 'Instant Participation',
    copy: 'Connect your wallet and start buying in seconds.',
  },
  {
    title: 'Secure Infrastructure',
    copy: 'Powered by BNB Chain smart contracts with on-chain verification.',
  },
]

function AboutFeaturesSection({
  isConnected = false,
  presaleWalletConnected = false,
  showNoWalletLink = true,
  onConnectWallet,
  onNoWallet,
  onProceedToPay,
}) {
  const [selectedPayment, setSelectedPayment] = useState(paymentMethods[0].name)
  const [payAmount, setPayAmount] = useState('')
  const [amountWarning, setAmountWarning] = useState('')
  const [isPayConfirming, setIsPayConfirming] = useState(false)
  const amountWarningTimerRef = useRef(null)
  const [successPurchase, setSuccessPurchase] = useState(null)
  const [successClaim, setSuccessClaim] = useState(null)
  const { address: walletAddress } = useAccount()
  const { buy, isBuying, buyError, isPresaleConfigured } = usePresaleBuy()
  const presaleStats = usePresaleStats()
  const treasurySelected = isTreasuryPaymentMethod(selectedPayment)
  const configuredTreasuryNetworks = useMemo(
    () => (treasurySelected ? getConfiguredTreasuryNetworks(selectedPayment) : []),
    [selectedPayment, treasurySelected],
  )

  const { treasuryNetworkKey: selectedTreasuryNetwork } = useTreasuryNetworkDetect(
    selectedPayment,
    isConnected && treasurySelected,
  )

  useEffect(() => {
    setPayAmount('')
    setAmountWarning('')
  }, [selectedPayment])

  useEffect(() => {
    if (!walletAddress) {
      setPayAmount('')
      setAmountWarning('')
    }
  }, [walletAddress])

  useEffect(() => {
    return () => {
      if (amountWarningTimerRef.current) {
        window.clearTimeout(amountWarningTimerRef.current)
      }
    }
  }, [])

  const paymentMethodReady = treasurySelected
    ? isTreasuryRouteConfigured(selectedPayment, selectedTreasuryNetwork)
    : isPresaleConfigured
  const quoteTreasuryNetwork = getTreasuryQuoteNetworkKey(
    selectedPayment,
    selectedTreasuryNetwork,
  )
  const quoteEnabled = treasurySelected
    ? isTreasuryQuoteEnabled(selectedPayment) && isPresaleConfigured
    : isPresaleConfigured
  const presaleActualPriceLabel =
    presaleStats.tokenPriceLabel || (presaleStats.fromContract ? '' : '$0.0007')
  const { quotedReceive } = usePresaleQuote(
    selectedPayment,
    payAmount,
    quoteEnabled,
    quoteTreasuryNetwork,
  )
  const balanceEnabled =
    Boolean(walletAddress) &&
    (treasurySelected ? configuredTreasuryNetworks.length > 0 : paymentMethodReady)
  const { maxPayAmount, isLoadingMaxPay, fetchMaxPayAmount } = usePaymentBalance(
    selectedPayment,
    selectedTreasuryNetwork,
    balanceEnabled,
  )
  const receiveAmount = quotedReceive

  usePaymentChainSwitch({
    paymentMethod: selectedPayment,
    treasuryNetworkKey: selectedTreasuryNetwork,
    enabled: isConnected && paymentMethodReady,
  })

  const raisedDisplay = `${formatCompactUsd(PRESALE_USD_RAISED)} / ${formatCompactUsd(PRESALE_USD_GOAL)}`
  const progressWidth = `${Math.min(100, (PRESALE_USD_RAISED / PRESALE_USD_GOAL) * 100)}%`

  const maxPayRaw = String(maxPayAmount ?? '').trim()
  const maxPayNum = Number(maxPayRaw)
  const hasValidMax =
    maxPayRaw !== '' && Number.isFinite(maxPayNum) && maxPayNum > 0
  const showWalletConfirm = isBuying || isPayConfirming

  const panelMode = (import.meta.env.VITE_APP_PANEL_MODE || 'buy').toString().trim().toLowerCase()
  const isClaimMode = panelMode === 'claim'
  const claimState = usePresaleClaim(isClaimMode && isPresaleConfigured)
  const pancakeSwapBuyUrl = (
    import.meta.env.VITE_PANCAKESWAP_BUY_URL || 'https://pancakeswap.finance/swap'
  )
    .toString()
    .trim()

  const claimTokenSymbol = CLAIM_TOKEN_SYMBOL
  const claimTokenMoniker = `$${claimTokenSymbol}`
  const claimTokenAddress = (
    claimState.tokenAddress ||
    import.meta.env.VITE_CLAIM_TOKEN_ADDRESS ||
    '0xc7d77217564221C1B7e0B08D43510367296c23E7'
  )
    .toString()
    .trim()
  const claimUsdtRaisedFormatted = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(CLAIM_USD_RAISED),
    []
  )

  const claimPurchasedDisplay = useMemo(() => {
    if (isClaimMode && isPresaleConfigured && isConnected) {
      return claimState.purchasedDisplay
    }
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(
      CLAIM_PURCHASED_AMOUNT_FALLBACK
    )
  }, [claimState.purchasedDisplay, isClaimMode, isConnected, isPresaleConfigured])

  const claimButtonLabel = (() => {
    if (claimState.isLoading) return 'Loading…'
    if (claimState.isClaiming) return 'Confirm in wallet…'
    if (!claimState.saleFinalized) return 'Claim pending finalize'
    if (!claimState.claimStarted) return 'Claim not started'
    if (Number(claimState.claimableDisplay.replace(/,/g, '')) > 0) return 'Claim'
    if (Number(claimState.purchasedDisplay.replace(/,/g, '')) > 0) return 'Already claimed'
    return 'Nothing to claim'
  })()

  const claimPurchasedInfo = (
    import.meta.env.VITE_CLAIM_PURCHASED_INFO ||
    'Amount of tokens purchased in the presale that count toward your claim allocation.'
  )
    .toString()
    .trim()

  function isValidPayAmount(amount) {
    const raw = String(amount ?? '').trim()
    const n = Number(raw)
    return raw !== '' && Number.isFinite(n) && n > 0
  }

  function showAmountWarning() {
    setAmountWarning('Enter a Valid Amount')
    if (amountWarningTimerRef.current) {
      window.clearTimeout(amountWarningTimerRef.current)
    }
    amountWarningTimerRef.current = window.setTimeout(() => {
      setAmountWarning('')
      amountWarningTimerRef.current = null
    }, 2500)
  }

  function handlePayAmountChange(event) {
    const next = event.target.value
    if (next === '' || /^\d*\.?\d*$/.test(next)) {
      setPayAmount(next)
      if (amountWarning) {
        setAmountWarning('')
      }
    }
  }

  async function applyMaxPay() {
    if (!walletAddress) {
      onConnectWallet?.()
      return
    }
    if (hasValidMax) {
      setPayAmount(maxPayRaw)
      return
    }
    const amount = await fetchMaxPayAmount()
    if (amount) {
      setPayAmount(amount)
    }
  }

  async function handleProceedToPay() {
    if (!isValidPayAmount(payAmount)) {
      showAmountWarning()
      return
    }
    if (onProceedToPay) {
      setIsPayConfirming(true)
      try {
        await onProceedToPay({ paymentMethod: selectedPayment, amount: payAmount })
      } finally {
        setIsPayConfirming(false)
      }
      return
    }
    if (treasurySelected && !isTreasuryRouteConfigured(selectedPayment, selectedTreasuryNetwork)) {
      window.alert(
        `${selectedPayment} on the selected network is not configured. Check .env treasury settings.`,
      )
      return
    }
    if (!treasurySelected && !isPresaleConfigured) {
      window.alert('Presale contract is not configured. Set VITE_PRESALE_CONTRACT_ADDRESS in .env')
      return
    }
    setIsPayConfirming(true)
    try {
      const result = await buy({
        paymentMethod: selectedPayment,
        amountHuman: payAmount,
        treasuryNetworkKey: selectedTreasuryNetwork,
      })
      if (!result?.transactionHash) {
        return
      }
      if (treasurySelected && !result.dbRecorded) {
        return
      }
      setSuccessPurchase({
        tokenSymbol: claimTokenSymbol,
        tokensPurchased: result.tokensEstimated || receiveAmount,
        amountPaid: result.amountPaid || payAmount,
        paymentMethod: selectedPayment,
        transactionHash: result.transactionHash,
        chainId: result.chainId,
      })
      setPayAmount('')
      refreshMaxPay()
    } finally {
      setIsPayConfirming(false)
    }
  }

  return (
    <>
    <section className="about-features">
      <div className="hero-shell">
        <article className="hero-left">
          <h2 className="hero-title">
            Welcome to <em>Novex</em>
          </h2>
          <p className="hero-copy">
            Seamless cross-chain participation with a transparent and secure presale experience.
            Contribute using BNB, ETH, USDT, or USDC across multiple networks.
          </p>

          <a
            className="hero-cta"
            href="/whitepaper.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            WHITEPAPER
          </a>

          <div className="hero-visual" aria-hidden="true">
            <span className="hero-nebula hero-nebula--a" />
            <span className="hero-nebula hero-nebula--b" />
            <span className="hero-nebula hero-nebula--c" />

            <div className="hero-particles">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className="hero-cat-wrap">
              <span className="hero-orbit hero-orbit--one" />
              <span className="hero-orbit hero-orbit--two" />
              <span className="hero-coin hero-coin--eth">ETH</span>
              <span className="hero-coin hero-coin--usdt">USDT</span>
              <span className="hero-coin hero-coin--bnb">BNB</span>
            </div>
          </div>

          <div className="hero-feature-grid">
            {heroHighlights.map((item) => (
              <article key={item.title} className="hero-feature-card">
                <p>{item.title}</p>
                <span>{item.copy}</span>
              </article>
            ))}
          </div>
        </article>

        <div className="presale-stack">
          <article
            className="presale-card"
            id="presale"
            aria-label="Presale panel"
            hidden={isClaimMode}
          >
          <h2 className="presale-title">
            $NOVEX <em>{presaleStats.statusLabel}</em>
          </h2>

          <div className="presale-prices">
            <p>Actual Price: {presaleActualPriceLabel || '—'}</p>
            <p>Listing Price: {PRESALE_LISTING_PRICE_LABEL}</p>
          </div>

          <div className="presale-progress" aria-hidden="true">
            <span style={{ width: progressWidth }} />
          </div>

          <p className="presale-raised">USD Raised: {raisedDisplay}</p>
          <CountdownTimer targetDate={presaleStats.countdownTarget} />

          <h3 className="presale-subtitle">Presale Payment Methods</h3>
          <div className="presale-methods">
            {paymentMethods.map((method) => (
              <button
                key={method.name}
                type="button"
                className={`method-box ${selectedPayment === method.name ? 'is-active' : ''}`}
                onClick={() => setSelectedPayment(method.name)}
                aria-pressed={selectedPayment === method.name}
              >
                <span className="method-icon">
                  <img src={method.logo} alt={`${method.name} logo`} />
                </span>
                <span className="method-copy">
                  <strong>{method.name}</strong>
                </span>
              </button>
            ))}
          </div>

          <div className="presale-inputs">
            <label className="presale-input-box">
              <span>Pay with {selectedPayment}</span>
              <div className="presale-input-field">
                <input
                  className="presale-input-native"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={payAmount}
                  onChange={handlePayAmountChange}
                  placeholder="0"
                  aria-label={`Amount to pay in ${selectedPayment}`}
                />
                <button
                  type="button"
                  className="presale-max-btn"
                  onClick={applyMaxPay}
                  title={
                    !walletAddress
                      ? 'Connect wallet to use your balance'
                      : isLoadingMaxPay
                        ? 'Loading wallet balance…'
                        : !hasValidMax
                          ? 'No spendable balance for this payment method'
                          : undefined
                  }
                >
                  MAX
                </button>
              </div>
            </label>
            <label className="presale-input-box">
              <span>Receive $NOVEX</span>
              <div className="presale-input-field presale-input-field--readonly">
                <input
                  className="presale-input-native presale-input-native--readonly"
                  type="text"
                  value={receiveAmount}
                  placeholder="0.00"
                  readOnly
                  tabIndex={-1}
                  aria-label="Novex tokens you will receive"
                />
              </div>
            </label>
          </div>

          {presaleWalletConnected ? (
            <>
              <button
                type="button"
                className="presale-connect-btn"
                disabled={showWalletConfirm}
                onClick={() => {
                  handleProceedToPay().catch(() => {})
                }}
              >
                {showWalletConfirm ? 'CONFIRM IN WALLET…' : 'PROCEED TO PAY'}
              </button>
              {amountWarning ? (
                <p className="presale-amount-warning" role="alert">
                  {amountWarning}
                </p>
              ) : null}
            </>
          ) : (
            <button type="button" className="presale-connect-btn" onClick={onConnectWallet}>
              Buy Now
            </button>
          )}

          {buyError ? (
            <p className="presale-buy-error" role="alert">
              {buyError}
            </p>
          ) : null}

          {showNoWalletLink ? (
            <a
              href="#"
              className="presale-referral-link"
              onClick={(event) => {
                event.preventDefault()
                onNoWallet?.()
              }}
            >
              Don&apos;t have a wallet?
            </a>
          ) : null}
        </article>

          <article
            className="presale-card claim-panel"
            id="claim"
            aria-label="Claim panel"
            hidden={!isClaimMode}
          >
            <h2 className="presale-title claim-panel-headline">
              <span className="claim-panel-headline__token">{claimTokenMoniker}</span>{' '}
              <em>Claim</em> and Token now LIVE!
            </h2>
            <p className="presale-subtitle claim-panel-intro">
              You can now claim your {claimTokenMoniker} tokens. Plus, stake your tokens to earn rewards! Add{' '}
              <span className="claim-panel-contract">{claimTokenAddress}</span> to your wallet to see your{' '}
              {claimTokenMoniker}.
            </p>
            {claimUsdtRaisedFormatted ? (
              <p className="claim-panel-raised" aria-label="USDT raised in presale">
                <span className="claim-panel-raised__label">USDT Raised:</span>{' '}
                <span className="claim-panel-raised__value">{claimUsdtRaisedFormatted}</span>
              </p>
            ) : null}
            <p className="claim-panel-purchased">
              <span className="claim-panel-purchased__text">
                YOUR PURCHASED {claimTokenMoniker} = {claimPurchasedDisplay}
              </span>
              <button
                type="button"
                className="claim-panel-info-btn"
                title={claimPurchasedInfo}
                aria-label={claimPurchasedInfo}
              >
                <span aria-hidden="true">i</span>
              </button>
            </p>
            {isConnected && Number(claimState.claimableDisplay.replace(/,/g, '')) > 0 ? (
              <p className="claim-panel-purchased">
                <span className="claim-panel-purchased__text">
                  CLAIMABLE {claimTokenMoniker} = {claimState.claimableDisplay}
                </span>
              </p>
            ) : null}
            {claimState.claimError ? (
              <p className="presale-buy-error" role="alert">
                {claimState.claimError}
              </p>
            ) : null}
            <div className="claim-panel-actions">
              {isConnected ? (
                <button
                  type="button"
                  className="claim-panel-cta"
                  disabled={!claimState.canClaim}
                  onClick={async () => {
                    const tokensClaimed = claimState.claimableDisplay
                    try {
                      const result = await claimState.claim()
                      if (result?.transactionHash) {
                        setSuccessClaim({
                          tokenSymbol: claimTokenSymbol,
                          tokensClaimed,
                          transactionHash: result.transactionHash,
                        })
                      }
                    } catch {
                      /* claim error shown via claimState.claimError */
                    }
                  }}
                >
                  {claimButtonLabel}
                </button>
              ) : (
                <button type="button" className="claim-panel-cta" onClick={onConnectWallet}>
                  Connect Wallet
                </button>
              )}
              <a
                href={pancakeSwapBuyUrl}
                className="claim-panel-cta"
                target="_blank"
                rel="noopener noreferrer"
              >
                Buy on PancakeSwap
              </a>
            </div>
            {showNoWalletLink ? (
              <a
                href="#"
                className="presale-referral-link claim-panel-referral"
                onClick={(event) => {
                  event.preventDefault()
                  onNoWallet?.()
                }}
              >
                Don&apos;t have a wallet?
              </a>
            ) : null}
          </article>
        </div>
      </div>

    </section>

    <PurchaseSuccessModal
      isOpen={Boolean(successPurchase)}
      onClose={() => setSuccessPurchase(null)}
      tokenSymbol={successPurchase?.tokenSymbol}
      tokensPurchased={successPurchase?.tokensPurchased}
      amountPaid={successPurchase?.amountPaid}
      paymentMethod={successPurchase?.paymentMethod}
      transactionHash={successPurchase?.transactionHash}
      chainId={successPurchase?.chainId}
    />

    <ClaimSuccessModal
      isOpen={Boolean(successClaim)}
      onClose={() => setSuccessClaim(null)}
      tokenSymbol={successClaim?.tokenSymbol}
      tokensClaimed={successClaim?.tokensClaimed}
      transactionHash={successClaim?.transactionHash}
    />
    </>
  )
}

export default AboutFeaturesSection
