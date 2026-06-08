const roadmapPhases = [
  {
    title: 'Phase 1 — Foundation',
    period: '',
    tone: 'ecosystem',
    active: true,
    points: [
      'Smart contract architecture',
      'Security testing and deployment',
      'Website launch',
      'Community establishment',
      'Multi-chain payment integration',
    ],
  },
  {
    title: 'Phase 2 — Presale Launch',
    period: '',
    tone: 'ecosystem',
    points: [
      'Public presale activation',
      'Marketing expansion',
      'Strategic partnerships',
      'Community growth campaigns',
      'Cross-chain onboarding',
    ],
  },
  {
    title: 'Phase 3 — Market Launch',
    period: '',
    tone: 'growth',
    points: [
      'DEX listing',
      'Liquidity deployment',
      'Token claim activation',
      'Market tracking integrations',
      'Ecosystem expansion',
    ],
  },
  {
    title: 'Phase 4 — Ecosystem Growth',
    period: '',
    tone: 'ecosystem',
    points: [
      'Utility development',
      'Additional partnerships',
      'Advanced platform features',
      'Global community expansion',
      'Future exchange opportunities',
    ],
  },
]

function RoadmapSection({ id = 'roadmap' }) {
  return (
    <section
      id={id}
      className="step-section section-anchor roadmap-section"
      aria-labelledby="roadmap-heading"
    >
      <div className="step-section__inner roadmap-section__inner">
        <div className="roadmap-timeline-wrap">
          <h1 id="roadmap-heading" className="roadmap-timeline__title">
            Our Project Roadmap
          </h1>
          <h3 className="roadmap-timeline__note">
            We are committed to transparency and continuous development as we grow the Novex
            ecosystem.
          </h3>
          <div className="roadmap-timeline">
            {roadmapPhases.map((phase, index) => (
              <article
                key={phase.title}
                className={`timeline-item timeline-item--${index % 2 === 0 ? 'left' : 'right'}`}
              >
                <span
                  className={`timeline-dot ${phase.active ? 'is-active' : ''}`}
                  aria-hidden="true"
                />
                <div className={`timeline-card timeline-card--${phase.tone}`}>
                  <div className="timeline-card__head">
                    <div>
                      <h3>{phase.title}</h3>
                      {phase.period ? (
                        <p className="timeline-card__period">{phase.period}</p>
                      ) : null}
                    </div>
                  </div>
                  <ul>
                    {phase.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default RoadmapSection
