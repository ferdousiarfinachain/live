import { memo, useCallback, useId, useState } from 'react'
import './FaqSection.css'

const faqItems = [
  {
    question: 'What is Novex?',
    answer:
      'Novex is the native token ecosystem focused on community presales, transparent allocations, and on-chain claims when enabled.',
  },
  {
    question: 'How do I join the $NOVEX presale?',
    answer:
      'Connect your wallet through the official presale widget on this site and follow the on-screen steps. Never send funds to unofficial addresses.',
  },
  {
    question: 'Which wallets are supported?',
    answer:
      'Common EVM wallets such as MetaMask, Rabby, Trust Wallet, and similar—always verify you are on the correct network.',
  },
  {
    question: 'Where can I get updates?',
    answer:
      'Follow official links from this website only. Staff will never DM you first or ask for your seed phrase.',
  },
  {
    question: 'When can I claim my $NOVEX tokens?',
    answer:
      'Claim timing follows the published presale schedule—typically after a stage ends or at TGE. Always use the claim flow on this official site and verify contract addresses before signing transactions.',
  },
  {
    question: 'Is staking available and how does it work?',
    answer:
      'If staking is offered, details including APY and lock periods will be announced here and in the staking UI. APY can change over time; review risks and only interact with contracts linked from this domain.',
  },
]

function FaqSection() {
  const baseId = useId()
  const [openIndex, setOpenIndex] = useState(null)

  const toggle = useCallback((index) => {
    setOpenIndex((current) => (current === index ? null : index))
  }, [])

  return (
    <div className="faq-section" aria-labelledby="faq-heading">
      <div className="faq-section__inner">
        <h1 id="faq-heading" className="faq-section__title">
          F A Q
        </h1>
        <p className="faq-section__subtitle">Our token and presale questions</p>
        <div className="faq-accordion">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index
            const panelId = `${baseId}-panel-${index}`
            const triggerId = `${baseId}-trigger-${index}`

            return (
              <div key={item.question} className={`faq-item${isOpen ? ' faq-item--open' : ''}`}>
                <h3 className="faq-item__heading">
                  <button
                    id={triggerId}
                    type="button"
                    className="faq-trigger"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(index)}
                  >
                    <span className="faq-trigger__text">{item.question}</span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  className="faq-panel-wrap"
                  role="region"
                  aria-labelledby={triggerId}
                  hidden={!isOpen}
                >
                  <div className="faq-panel">
                    <p>{item.answer}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default memo(FaqSection)
