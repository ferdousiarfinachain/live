import { memo, useCallback, useId, useState } from 'react'
import './FaqSection.css'

const faqItems = [
  {
    question: 'What is Novex?',
    answer:
      'Novex is the native token ecosystem focused on community presales, transparent allocations, and on-chain claims when enabled.',
  },
  {
    question: 'What payment methods are supported?',
    answer: 'You can participate using BNB, ETH, USDT, or USDC.',
  },
  {
    question: 'Which blockchain networks are supported?',
    answer:
      'BNB Smart Chain, Ethereum, Arbitrum, Base, Optimism, Polygon, and Avalanche.',
  },
  {
    question: 'Do I need to manually select a network?',
    answer:
      'No. The Novex app automatically detects supported balances and presents the best available payment options.',
  },
  {
    question: 'Where are presale contributions settled?',
    answer:
      'All contributions are securely processed into the Novex ecosystem on BNB Smart Chain.',
  },
  {
    question: 'Which wallets are supported?',
    answer: 'MetaMask, Rabby, Trust Wallet, and most EVM-compatible wallets.',
  },
  {
    question: 'When can I claim my $NOVEX tokens?',
    answer:
      'Token claims become available according to the official vesting and token generation event schedule.',
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
