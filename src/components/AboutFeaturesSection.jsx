import { useMemo, useState } from 'react'
import './AboutFeaturesSection.css'
import CountdownTimer from './CountdownTimer'
import ethLogo from 'cryptocurrency-icons/svg/color/eth.svg'
import bnbLogo from 'cryptocurrency-icons/svg/color/bnb.svg'
import usdtLogo from 'cryptocurrency-icons/svg/color/usdt.svg'

const paymentMethods = [
  { logo: ethLogo, name: 'ETH' },
  { logo: bnbLogo, name: 'BNB' },
  { logo: usdtLogo, name: 'USDT' },
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
}) {
  const [selectedPayment, setSelectedPayment] = useState('USDT')
  const [payAmount, setPayAmount] = useState('1')
  const tokenPriceUsd = 0.025
  const receiveAmount = useMemo(() => {
    const amount = Number(payAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return ''
    }
    return (amount / tokenPriceUsd).toFixed(2)
  }, [payAmount])

  return (
    <section className="about-features" id="home">
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

        <article className="presale-card" aria-label="Presale panel">
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
              <input
                type="number"
                min="0"
                step="any"
                value={payAmount}
                onChange={(event) => setPayAmount(event.target.value)}
              />
            </label>
            <label className="presale-input-box">
              <span>Receive $NOVEX</span>
              <input type="text" value={receiveAmount} readOnly />
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
      </div>

    </section>
  )
}

export default AboutFeaturesSection
