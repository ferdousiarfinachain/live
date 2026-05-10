import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeftRight, Wallet } from 'lucide-react'
import { FaDiscord, FaInstagram } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { SiBinance } from 'react-icons/si'
import { SiTelegram, SiTiktok } from 'react-icons/si'
import { useAccount, useDisconnect } from 'wagmi'
import './App.css'
import ConnectWalletModal from './ConnectWalletModal'
import AboutFeaturesSection from './components/AboutFeaturesSection'
import FaqStepSection from './components/FaqStepSection'
import RoadmapSection from './components/RoadmapSection'
import StarfieldBackground from './components/StarfieldBackground'
import TokenomicsSection from './components/TokenomicsSection'

const navItems = [
  { label: 'HOME', href: '#home' },
  { label: 'ABOUT', href: '#about' },
  { label: 'ROADMAP', href: '#roadmap' },
  { label: 'TOKENOMICS', href: '#tokenomics' },
  { label: 'HOW TO BUY', href: '#how-to-buy' },
  { label: 'FAQ', href: '#faq' },
]

const stepSections = [
  {
    id: 'roadmap',
    title: 'Roadmap',
    description:
      'Phase-by-phase launch progress, listings, campaigns, and ecosystem expansions will be shown here.',
  },
  {
    id: 'how-to-buy',
    title: 'How To Buy',
    description:
      'Simple step guide: create wallet, fund with USDT/ETH, connect wallet, and buy tokens safely.',
  },
  {
    id: 'faq',
    title: 'FAQ',
    description:
      'Answers about presale, wallets, and official updates appear in this section.',
  },
]

const howToBuySteps = [
  {
    number: '1',
    title: 'Create a Wallet',
    description:
      'Download MetaMask or Trust Wallet in your Phone or Chrome browser Extension. Keep your seed phrase secure and never share it with anyone.',
    iconKey: 'wallet',
  },
  {
    number: '2',
    title: 'Get BNB',
    description:
      'Purchase BNB directly in your wallet or buy on an exchange and transfer it to your wallet.',
    iconKey: 'bnb',
  },
  {
    number: '3',
    title: 'Get ETH and USDT',
    description:
      'Purchase ETH and USDT directly in your wallet or buy on an exchange and transfer it to your wallet.',
    iconKey: 'wallet-simple',
  },
  {
    number: '4',
    title: 'Swap for $NOVEX',
    description:
      'Enter the official $NOVEX contract address, set slippage to 5-7%, and confirm the transaction.',
    iconKey: 'swap',
  },
]

const renderHowToBuyIcon = (iconKey) => {
  if (iconKey === 'wallet') {
    return <Wallet className="how-to-buy-card__icon-svg how-to-buy-card__icon-svg--wallet" />
  }

  if (iconKey === 'bnb') {
    return <SiBinance className="how-to-buy-card__icon-svg how-to-buy-card__icon-svg--bnb" />
  }

  if (iconKey === 'wallet-simple') {
    return (
      <svg viewBox="0 0 24 24" className="how-to-buy-card__icon-svg how-to-buy-card__icon-svg--wallet-simple">
        <rect x="3" y="6" width="18" height="12" rx="2.5" />
        <path d="M3 10h18" />
        <path d="M15 13h5" />
        <circle cx="18.5" cy="13" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  return (
    <ArrowLeftRight className="how-to-buy-card__icon-svg how-to-buy-card__icon-svg--swap" />
  )
}

const howToBuySection = stepSections.find((section) => section.id === 'how-to-buy')
const roadmapSection = stepSections.find((section) => section.id === 'roadmap')
const faqSection = stepSections.find((section) => section.id === 'faq')
const socialLinks = [
  { label: 'X', href: '#', icon: FaXTwitter },
  { label: 'Telegram', href: '#', icon: SiTelegram },
  { label: 'Discord', href: '#', icon: FaDiscord },
  { label: 'TikTok', href: '#', icon: SiTiktok },
  { label: 'Instagram', href: '#', icon: FaInstagram },
]

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const [guideModalOpen, setGuideModalOpen] = useState(false)
  const { address, isConnected } = useAccount()
  const { disconnectAsync } = useDisconnect()

  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''

  useEffect(() => {
    if (!guideModalOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onEsc = (event) => {
      if (event.key === 'Escape') setGuideModalOpen(false)
    }
    window.addEventListener('keydown', onEsc)
    return () => {
      window.removeEventListener('keydown', onEsc)
      document.body.style.overflow = previousOverflow
    }
  }, [guideModalOpen])

  const handleNavClick = () => {
    setMenuOpen(false)
  }

  return (
    <div className="page">
      <StarfieldBackground />
      <header className="hero-header">
        <nav className="retro-nav">
          <a href="/" className="brand" aria-label="Novex Labs home">
            Novex Labs
          </a>

          <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
            {navItems.map((item) => (
              <li
                key={item.label}
                className={item.label.toUpperCase() === 'WHITEPAPER' ? 'whitepaper-item' : ''}
              >
                <a
                  href={item.href}
                  className={item.label.toUpperCase() === 'WHITEPAPER' ? 'whitepaper-link' : ''}
                  onClick={handleNavClick}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                >
                  {item.label}
                </a>
              </li>
            ))}

            <li className="mobile-nav-tools">
              {isConnected ? (
                <>
                  <button className="cta-btn mobile-buy-btn" type="button" aria-label={`Connected wallet ${shortAddress}`}>
                    {shortAddress}
                  </button>
                  <button
                    className="cta-btn mobile-buy-btn"
                    type="button"
                    onClick={async () => {
                      await disconnectAsync()
                    }}
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  className="cta-btn mobile-buy-btn"
                  type="button"
                  onClick={() => setConnectModalOpen(true)}
                >
                  Connect Wallet
                </button>
              )}
            </li>
          </ul>

          <div className="nav-actions">
            {isConnected ? (
              <>
                <button className="cta-btn" type="button" aria-label={`Connected wallet ${shortAddress}`}>
                  {shortAddress}
                </button>
                <button
                  className="cta-btn"
                  type="button"
                  onClick={async () => {
                    await disconnectAsync()
                  }}
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button className="cta-btn" type="button" onClick={() => setConnectModalOpen(true)}>
                Connect Wallet
              </button>
            )}
          </div>

          <button
            className={`menu-btn ${menuOpen ? 'open' : ''}`}
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </nav>
      </header>

      <main className="page-main">
        <section id="home" className="section-anchor">
          <AboutFeaturesSection
            isConnected={isConnected}
            onConnectWallet={() => setConnectModalOpen(true)}
            onNoWallet={() => setGuideModalOpen(true)}
            onProceedToPay={() => {
              // Presale payment flow hook point.
            }}
          />
        </section>

        <section id="about" className="about-section section-anchor">
          <div className="about-section__inner">
            <div className="about-section__image-space" aria-hidden="true">
              <img src="/about.png" alt="" />
            </div>
            <article className="about-section__content">
              <h2>About Novex</h2>
              <h3>Your Financial Freedom Starts Here</h3>
              <p>
                Novex is designed to give you full control over your money - without
                intermediaries, restrictions, or hidden risks.
              </p>
              <div className="about-section__why-card">
                <p className="about-section__why">Why Novex?</p>
                <ul>
                  <li>Fixed supply - protects against inflation</li>
                  <li>Decentralized - no single authority controls it</li>
                  <li>Secure and censorship-resistant</li>
                  <li>Full ownership - your assets, your control</li>
                </ul>
              </div>
              <p>
                Novex empowers individuals to store and transfer value freely, without
                relying on traditional systems.
              </p>
              <p>
                Built for those who believe in independence, privacy, and true financial ownership.
              </p>
              <button type="button" className="about-section__cta">Join Presale</button>
            </article>
          </div>
        </section>

        {howToBuySection && (
          <section id={howToBuySection.id} className="step-section how-to-buy-section section-anchor">
            <div className="step-section__inner how-to-buy__inner">
              <div className="how-to-buy__header">
                <h1 className="how-to-buy__title">
                  How to Buy <span>$NOVEX</span>
                </h1>
                <p className="how-to-buy__subtitle">
                  Join the Novex presale in four simple steps—secure, transparent, and built for the long term.
                </p>
              </div>
              <div className="how-to-buy__grid">
                {howToBuySteps.map((step) => (
                  <article key={step.number} className="how-to-buy-card">
                    <span className="how-to-buy-card__number" aria-hidden="true">
                      {step.number}
                    </span>
                    <span className="how-to-buy-card__icon" aria-hidden="true">
                      {renderHowToBuyIcon(step.iconKey)}
                    </span>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </article>
                ))}
              </div>
              <button type="button" className="how-to-buy__cta">
                BUY $NOVEX NOW
              </button>
            </div>
          </section>
        )}

        <TokenomicsSection />

        {roadmapSection && <RoadmapSection id={roadmapSection.id} />}

        {faqSection && <FaqStepSection id={faqSection.id} />}
      </main>

      <footer className="site-footer">
        <div className="footer-overlay">
          <p className="footer-disclaimer">
            Disclaimer: Cryptocurrencies are highly speculative. You may lose some or all of your
            capital. Nothing on this website is financial advice. Always do your own research before
            participating in any presale or token purchase.
          </p>
          <div className="footer-social" aria-label="Social media links">
            {socialLinks.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="footer-social__link"
                  aria-label={item.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon />
                </a>
              )
            })}
          </div>
        </div>
      </footer>

      <ConnectWalletModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onNoWallet={() => setGuideModalOpen(true)}
      />
      {guideModalOpen
        ? createPortal(
            <div
              className="wallet-modal-backdrop"
              onClick={() => setGuideModalOpen(false)}
              role="presentation"
            >
              <div
                className="wallet-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Get wallet guide"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="wallet-modal-close"
                  onClick={() => setGuideModalOpen(false)}
                  aria-label="Close wallet guide"
                >
                  ×
                </button>
                <h2 className="wallet-modal-title">Get Wallet</h2>
                <p className="wallet-modal-subtitle">
                  Scan to install MetaMask, then come back to connect.
                </p>
                <div className="wallet-guide-grid">
                  <figure className="wallet-guide-qr">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                        import.meta.env.VITE_METAMASK_DOWNLOAD_URL || 'https://metamask.io/download/',
                      )}`}
                      alt="MetaMask download QR code"
                    />
                  </figure>
                  <button
                    type="button"
                    className="wallet-guide-primary"
                    onClick={() => {
                      setGuideModalOpen(false)
                      setConnectModalOpen(true)
                    }}
                  >
                    I have a wallet - connect
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

    </div>
  )
}

export default App
