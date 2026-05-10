const roadmapPhases = [
  {
    title: 'Foundation',
    period: 'Phase 1',
    tone: 'launch',
    active: true,
    points: [
      'Project vision and strategy finalized',
      'Smart contract development and testing',
      'Website launch',
      'Core community building',
    ],
  },
  {
    title: 'Presale and Awareness',
    period: 'Phase 2',
    tone: 'ecosystem',
    points: [
      'Public presale launch',
      'Marketing campaigns and influencer partnerships',
      'Community growth (Telegram, Twitter)',
      'Early investor onboarding',
    ],
  },
  {
    title: 'Launch and Market Entry',
    period: 'Phase 3',
    tone: 'growth',
    points: [
      'Token listing (DEX)',
      'Liquidity pool setup and lock',
      'Listings on price tracking platforms',
      'Active trading and market exposure',
    ],
  },
  {
    title: 'Growth and Expansion',
    period: 'Phase 4',
    tone: 'ecosystem',
    points: [
      'Utility and platform development',
      'Strategic partnerships',
      'Ecosystem expansion',
      'Future CEX listings and scaling',
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
                      <p className="timeline-card__period">{phase.period}</p>
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
