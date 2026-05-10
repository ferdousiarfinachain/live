import FaqSection from './FaqSection'

function FaqStepSection({ id = 'faq' }) {
  return (
    <section id={id} className="step-section section-anchor faq-step-section">
      <div className="step-section__inner faq-step-section__inner">
        <FaqSection />
      </div>
    </section>
  )
}

export default FaqStepSection
