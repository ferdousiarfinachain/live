import { useState } from 'react'
import { ArrowLeftRight, Wallet } from 'lucide-react'
import { FaXTwitter } from 'react-icons/fa6'
import { SiBinance, SiTelegram } from 'react-icons/si'
import {
  ConnectWalletModal,
  openReownMetaMaskDownloads,
  useWalletSession,
} from './wallet'
import './App.css'
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
      'Install MetaMask or another supported EVM wallet and securely store your recovery phrase.',
    iconKey: 'wallet',
  },
  {
    number: '2',
    title: 'Fund Your Wallet',
    description: 'Hold BNB, ETH, USDT, or USDC on any supported network.',
    iconKey: 'bnb',
  },
  {
    number: '3',
    title: 'Connect Wallet',
    description: 'Connect your wallet to the official Novex presale application.',
    iconKey: 'wallet-simple',
  },
  {
    number: '4',
    title: 'Complete Purchase',
    description:
      'The system automatically detects your supported balances and allows you to purchase $NOVEX directly from your preferred network.',
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
function scrollToPresalePanel() {
  document.getElementById('presale')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const socialLinks = [
  { label: 'X', href: 'https://x.com/novexfi_web3', icon: FaXTwitter },
  { label: 'Telegram', href: 'https://t.me/novexweb3', icon: SiTelegram },
]

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const {
    isConnected,
    presaleWalletConnected,
    showNoWalletLink,
    headerShortAddress,
    handleDisconnect,
  } = useWalletSession()

  const openConnectWallet = () => setConnectModalOpen(true)
  const openNoWalletGuide = () => {
    void openReownMetaMaskDownloads()
  }

  const handleNavClick = () => {
    setMenuOpen(false)
  }

  const handleLandingPageClick = () => {
    if (menuOpen) {
      setMenuOpen(false)
    }
  }

  return (
    <div className="page">
      <StarfieldBackground />
      <header className="hero-header">
        <nav className="retro-nav">
          <a href="/" className="brand" aria-label="Novex Fi home">
            Novex Fi
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
              {presaleWalletConnected ? (
                <>
                  <button
                    className="cta-btn mobile-buy-btn"
                    type="button"
                    aria-label={`Connected wallet ${headerShortAddress}`}
                  >
                    {headerShortAddress}
                  </button>
                  <button
                    className="cta-btn mobile-buy-btn"
                    type="button"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  className="cta-btn mobile-buy-btn"
                  type="button"
                  onClick={openConnectWallet}
                >
                  Connect Wallet
                </button>
              )}
            </li>
          </ul>

          <div className="nav-actions">
            {presaleWalletConnected ? (
              <>
                <button
                  className="cta-btn"
                  type="button"
                  aria-label={`Connected wallet ${headerShortAddress}`}
                >
                  {headerShortAddress}
                </button>
                <button
                  className="cta-btn"
                  type="button"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button className="cta-btn" type="button" onClick={openConnectWallet}>
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

      <main className="page-main" onClick={handleLandingPageClick}>
        <section id="home" className="section-anchor">
          <AboutFeaturesSection
            isConnected={isConnected}
            presaleWalletConnected={presaleWalletConnected}
            showNoWalletLink={showNoWalletLink}
            onConnectWallet={openConnectWallet}
            onNoWallet={openNoWalletGuide}
          />
        </section>

        <section id="about" className="about-section section-anchor">
          <div className="about-section__inner">
            <div className="about-section__image-space" aria-hidden="true">
              <img src="/about.png" alt="" />
            </div>
            <article className="about-section__content">
              <h2>About Our $NVX Token</h2>
              <h3>The Future of Cross-Chain Participation</h3>
              <p>
                Novex is building a simple and accessible presale ecosystem that removes
                blockchain barriers and allows users to participate using assets they already
                hold.
              </p>
              <p>
                Whether your funds are on Ethereum, Arbitrum, Base, Optimism, Polygon,
                Avalanche, or BNB Smart Chain, Novex enables a seamless contribution experience
                without unnecessary complexity.
              </p>
              <div className="about-section__why-card">
                <p className="about-section__why">Why Novex ($NVX) Token?</p>
                <ul>
                  <li>Multi-chain payment support</li>
                  <li>Transparent presale allocation</li>
                  <li>Secure BNB Smart Chain infrastructure</li>
                  <li>Fast participation process</li>
                  <li>Community-driven growth</li>
                  <li>Fixed supply token model</li>
                </ul>
              </div>
              <p>
                Novex is designed for users who want flexibility, transparency, and full
                control over their digital assets.
              </p>
              <button
                type="button"
                className="about-section__cta"
                onClick={scrollToPresalePanel}
              >
                Buy $NVX 
              </button>
            </article>
          </div>
        </section>

        {howToBuySection && (
          <section id={howToBuySection.id} className="step-section how-to-buy-section section-anchor">
            <div className="step-section__inner how-to-buy__inner">
              <div className="how-to-buy__header">
                <h1 className="how-to-buy__title">
                  How to Buy <span>$NVX Token</span>
                </h1>
                <p className="how-to-buy__subtitle">
                  Join the Novex presale in four simple steps.
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
              <button type="button" className="how-to-buy__cta" onClick={scrollToPresalePanel}>
                BUY $NVX TOKEN NOW
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
      />

    </div>
  )
}

export default App
