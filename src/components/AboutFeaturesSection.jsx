import { useMemo, useState } from 'react'
import './AboutFeaturesSection.css'
import CountdownTimer from './CountdownTimer'
import ethLogo from 'cryptocurrency-icons/svg/color/eth.svg'
import bnbLogo from 'cryptocurrency-icons/svg/color/bnb.svg'
import usdtLogo from 'cryptocurrency-icons/svg/color/usdt.svg'
import usdcLogo from 'cryptocurrency-icons/svg/color/usdc.svg'

const paymentMethods = [
  { logo: ethLogo, name: 'ETH' },
  { logo: bnbLogo, name: 'BNB' },
  { logo: usdtLogo, name: 'USDT' },
  { logo: usdcLogo, name: 'USDC' },
]

const heroHighlights = [
  { title: 'Audited Contract', copy: 'Security-first launch with transparent checks.' },
  { title: 'Instant Claim', copy: 'Claim tokens fast after each presale stage.' },
  { title: 'Global Community', copy: '24/7 active holders and trading momentum.' },
]

function AboutFeaturesSection({
  isConnected = false,
  onConnectWallet,
  onNoWallet,
  onProceedToPay,
  maxPayAmount = '',
}) {
  const [selectedPayment, setSelectedPayment] = useState('USDT')
  const [payAmount, setPayAmount] = useState('')
  const tokenPriceUsd = 0.025
  const receiveAmount = useMemo(() => {
    const amount = Number(payAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return ''
    }
    return (amount / tokenPriceUsd).toFixed(2)
  }, [payAmount])

  const maxPayRaw = String(maxPayAmount ?? '').trim()
  const maxPayNum = Number(maxPayRaw)
  const hasValidMax =
    maxPayRaw !== '' && Number.isFinite(maxPayNum) && maxPayNum > 0

  const panelMode = (import.meta.env.VITE_APP_PANEL_MODE || 'buy').toString().trim().toLowerCase()
  const isClaimMode = panelMode === 'claim'
  const pancakeSwapBuyUrl = (
    import.meta.env.VITE_PANCAKESWAP_BUY_URL || 'https://pancakeswap.finance/swap'
  )
    .toString()
    .trim()

  const claimTokenSymbol = (() => {
    const raw = (import.meta.env.VITE_CLAIM_TOKEN_SYMBOL ?? 'NOVEX').toString().trim().replace(/^\$+/, '')
    return raw || 'NOVEX'
  })()
  const claimTokenMoniker = `$${claimTokenSymbol}`
  const claimTokenAddress = (
    import.meta.env.VITE_CLAIM_TOKEN_ADDRESS || '0xEfC814a4C676a7314a13954e283dE6CEF597e6b2'
  )
    .toString()
    .trim()
  const claimUsdtRaisedFormatted = useMemo(() => {
    const raw = (import.meta.env.VITE_CLAIM_USDT_RAISED ?? '10692211.26')
      .toString()
      .replace(/,/g, '')
      .trim()
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) {
      return ''
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  }, [])

  const claimPurchasedDisplay = useMemo(() => {
    const raw = (import.meta.env.VITE_CLAIM_PURCHASED_AMOUNT ?? '0').toString().trim()
    if (raw === '') return '0'
    const n = Number(raw.replace(/,/g, ''))
    if (!Number.isFinite(n)) return raw
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(n)
  }, [])

  const claimPurchasedInfo = (
    import.meta.env.VITE_CLAIM_PURCHASED_INFO ||
    'Amount of tokens purchased in the presale that count toward your claim allocation.'
  )
    .toString()
    .trim()

  function handlePayAmountChange(event) {
    const next = event.target.value
    if (next === '' || /^\d*\.?\d*$/.test(next)) {
      setPayAmount(next)
    }
  }

  function applyMaxPay() {
    if (!isConnected) {
      onConnectWallet?.()
      return
    }
    if (!hasValidMax) return
    setPayAmount(maxPayRaw)
  }

  return (
    <section className="about-features">
      <div className="hero-shell">
        <article className="hero-left">
          <h2 className="hero-title">
            Welcome to <em>Novex</em>
          </h2>
          <p className="hero-copy">
            Novex pairs transparent presale mechanics with secure claims and community-first
            tokenomics—crafted by Novex Labs for holders who value clarity and control.
          </p>

          <a
            className="hero-cta"
            href="/pathways.pdf"
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
          <h2 className="presale-title">$NOVEX  <em>Presale LIVE</em></h2>

          <div className="presale-prices">
            <p>Actual Price: $0.025</p>
            <p>Listing Price: $0.025</p>
          </div>

          <div className="presale-progress" aria-hidden="true">
            <span />
          </div>

          <p className="presale-raised">USD Raised: $543,291 / $1,000,000</p>
          <CountdownTimer />

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
                  disabled={isConnected && !hasValidMax}
                  title={
                    !isConnected
                      ? 'Connect wallet to use your balance'
                      : !hasValidMax
                        ? 'Wallet balance not loaded yet'
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

          {isConnected ? (
            <button
              type="button"
              className="presale-connect-btn"
              onClick={() => {
                onProceedToPay?.()
              }}
            >
              PROCEED TO PAY
            </button>
          ) : (
            <button type="button" className="presale-connect-btn" onClick={onConnectWallet}>
              Buy Now
            </button>
          )}

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
            <div className="claim-panel-actions">
              {isConnected ? (
                <button type="button" className="claim-panel-cta" disabled>
                  Claim (soon)
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
          </article>
        </div>
      </div>

    </section>
  )
}

export default AboutFeaturesSection
