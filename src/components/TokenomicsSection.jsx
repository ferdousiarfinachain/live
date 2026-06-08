import { useMemo, useState } from 'react'
import './TokenomicsSection.css'

/** Slightly larger canvas */
const CX = 450
const CY = 450
const R_OUTER = 192
const R_INNER = 72
const VB = 900

function polar(cx, cy, r, angleDeg) {
  const a = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function donutSlicePath(cx, cy, rOut, rIn, startDeg, endDeg) {
  const pOut0 = polar(cx, cy, rOut, startDeg)
  const pOut1 = polar(cx, cy, rOut, endDeg)
  const pIn1 = polar(cx, cy, rIn, endDeg)
  const pIn0 = polar(cx, cy, rIn, startDeg)
  let delta = endDeg - startDeg
  while (delta <= -360) delta += 360
  while (delta > 360) delta -= 360
  const largeArc = Math.abs(delta) > 180 ? 1 : 0
  const sweepOut = delta > 0 ? 1 : 0
  const sweepIn = delta > 0 ? 0 : 1
  return [
    `M ${pOut0.x} ${pOut0.y}`,
    `A ${rOut} ${rOut} 0 ${largeArc} ${sweepOut} ${pOut1.x} ${pOut1.y}`,
    `L ${pIn1.x} ${pIn1.y}`,
    `A ${rIn} ${rIn} 0 ${largeArc} ${sweepIn} ${pIn0.x} ${pIn0.y}`,
    'Z',
  ].join(' ')
}

/**
 * Clockwise from top-left: Liquidity → Team → Treasury → Early Investors → Marketing → Pre-sale → Airdrop
 */
const ALLOCATION = [
  {
    label: 'Liquidity and Pools',
    shortLabel: 'Liquidity & Pools',
    pct: 25,
    fill: 'url(#tokLiq)',
    accent: '#5cf0e8',
    line: 'rgba(92, 240, 232, 0.82)',
  },
  {
    label: 'Team',
    shortLabel: 'Team',
    pct: 15,
    fill: 'url(#tokTeam)',
    accent: '#38bdf8',
    line: 'rgba(56, 189, 248, 0.88)',
  },
  {
    label: 'Treasury Reserve',
    shortLabel: 'Treasury',
    pct: 10,
    fill: 'url(#tokTre)',
    accent: '#4ade80',
    line: 'rgba(74, 222, 128, 0.85)',
  },
  {
    label: 'Early Investors',
    shortLabel: 'Early Investors',
    pct: 10,
    fill: 'url(#tokEarly)',
    accent: '#fcd34d',
    line: 'rgba(252, 211, 77, 0.88)',
  },
  {
    label: 'Marketing',
    shortLabel: 'Marketing',
    pct: 15,
    fill: 'url(#tokMkt)',
    accent: '#fb7185',
    line: 'rgba(251, 113, 133, 0.88)',
  },
  {
    label: 'Pre-sale',
    shortLabel: 'Pre-sale',
    pct: 15,
    fill: 'url(#tokPre)',
    accent: '#c4b5fd',
    line: 'rgba(196, 181, 253, 0.88)',
  },
  {
    label: 'Airdrop',
    shortLabel: 'Airdrop',
    pct: 10,
    fill: 'url(#tokAir)',
    accent: '#caff5c',
    line: 'rgba(202, 255, 92, 0.85)',
  },
]

/** Three centered rows: 3 + 3 + 1 (last row single item). */
const LEGEND_ROWS = [
  ['Liquidity and Pools', 'Airdrop', 'Pre-sale'],
  ['Treasury Reserve', 'Early Investors', 'Marketing'],
  ['Team'],
]

function allocationByLabel(label) {
  return ALLOCATION.find((a) => a.label === label)
}

const VESTING = [
  {
    title: 'Airdrop',
    detail: '12 months linear',
    barClass: 'tokenomics-vesting__bar--lime',
  },
  {
    title: 'Early Investors',
    detail: '10% at TGE and then linear vesting 36 months',
    barClass: 'tokenomics-vesting__bar--mid',
  },
  {
    title: 'Treasury Reserve',
    detail: '36 months linear',
    barClass: 'tokenomics-vesting__bar--olive',
  },
  {
    title: 'Pre-sale',
    detail: '30% at TGE and then linear vesting over 9 months',
    barClass: 'tokenomics-vesting__bar--mid',
  },
  {
    title: 'Marketing',
    detail: '36 months linear',
    barClass: 'tokenomics-vesting__bar--olive',
  },
  {
    title: 'Team',
    detail: '12 month cliff, then linear vesting over 48 months',
    barClass: 'tokenomics-vesting__bar--mid',
  },
  {
    title: 'Liquidity and Pools',
    detail: 'Available at TGE for market making and DEX/CEX liquidity.',
    barClass: 'tokenomics-vesting__bar--olive-dark',
  },
]

function calloutGeom(midDeg) {
  const rad = (midDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const rim = polar(CX, CY, R_OUTER, midDeg)
  const knee = polar(CX, CY, R_OUTER + 28, midDeg)
  const horizontal = 68
  const flip = cos >= 0 ? 1 : -1
  const tail = Math.abs(cos) < 0.18 ? (sin > 0 ? horizontal * 0.88 : horizontal) : horizontal
  const end = {
    x: knee.x + flip * tail,
    y: knee.y,
  }
  const anchor = flip >= 0 ? 'start' : 'end'
  const textX = end.x + flip * 12
  const textY = end.y
  const poly = `${rim.x},${rim.y} ${knee.x},${knee.y} ${end.x},${end.y}`
  return { poly, textX, textY, anchor, dotX: rim.x, dotY: rim.y }
}

function buildSlices() {
  let angle = -90
  const slices = []
  for (let i = 0; i < ALLOCATION.length; i++) {
    const row = ALLOCATION[i]
    const sweep = (-360 * row.pct) / 100
    const end = angle + sweep
    const mid = angle + sweep / 2
    slices.push({
      key: row.label,
      path: donutSlicePath(CX, CY, R_OUTER, R_INNER, angle, end),
      midAngle: mid,
      pct: row.pct,
      label: row.label,
      shortLabel: row.shortLabel,
      fill: row.fill,
      accent: row.accent,
      line: row.line,
      geom: calloutGeom(mid),
    })
    angle = end
  }
  return slices
}

export default function TokenomicsSection({ id = 'tokenomics' }) {
  const [hovered, setHovered] = useState(null)
  const slices = useMemo(() => buildSlices(), [])

  /** Draw hovered wedge last so it stacks above neighbors when scaled */
  const sliceDrawOrder = useMemo(() => {
    if (!hovered) return slices
    const hi = slices.filter((s) => s.key === hovered)
    const lo = slices.filter((s) => s.key !== hovered)
    return [...lo, ...hi]
  }, [slices, hovered])

  const hoveredSlice = hovered ? slices.find((s) => s.key === hovered) : null

  return (
    <section id={id} className="tokenomics-section section-anchor">
      <div className="tokenomics-section__inner">
        <header className="tokenomics-section__header">
          <div className="tokenomics-section__title-row">
            <h2 className="tokenomics-section__title">Tokenomics</h2>
            <span className="tokenomics-section__badge">
              <span className="tokenomics-section__badge-dot" aria-hidden="true" />
              $NOVEX Token
            </span>
          </div>
          <p className="tokenomics-section__subtitle">
            Novex tokenomics are designed for sustainable growth, liquidity, and community
            participation with transparent token distribution.
          </p>
        </header>

        <div className="tokenomics-section__grid">
          <div
            className="tokenomics-chart-wrap"
            onMouseLeave={() => setHovered(null)}
          >
            <div className="tokenomics-chart">
              <svg
                className="tokenomics-chart__svg"
                viewBox={`0 0 ${VB} ${VB}`}
                aria-label="Token allocation donut chart"
                role="img"
              >
                <defs>
                  <filter id="tokSliceGlow" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
                    <feGaussianBlur stdDeviation="5" result="b" />
                    <feColorMatrix
                      in="b"
                      type="matrix"
                      values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.75 0"
                      result="b2"
                    />
                    <feMerge>
                      <feMergeNode in="b2" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  <radialGradient id="tokLiq" cx="36%" cy="32%" r="85%">
                    <stop offset="0%" stopColor="#7afbf4" />
                    <stop offset="55%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#0e7490" />
                  </radialGradient>
                  <radialGradient id="tokTeam" cx="26%" cy="44%" r="85%">
                    <stop offset="0%" stopColor="#7dd3fc" />
                    <stop offset="50%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0369a1" />
                  </radialGradient>
                  <radialGradient id="tokTre" cx="28%" cy="70%" r="85%">
                    <stop offset="0%" stopColor="#6ee7b7" />
                    <stop offset="52%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#047857" />
                  </radialGradient>
                  <radialGradient id="tokEarly" cx="48%" cy="78%" r="85%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="50%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#b45309" />
                  </radialGradient>
                  <radialGradient id="tokMkt" cx="68%" cy="72%" r="85%">
                    <stop offset="0%" stopColor="#fecdd3" />
                    <stop offset="45%" stopColor="#fb7185" />
                    <stop offset="100%" stopColor="#9f1239" />
                  </radialGradient>
                  <radialGradient id="tokPre" cx="72%" cy="42%" r="85%">
                    <stop offset="0%" stopColor="#ddd6fe" />
                    <stop offset="48%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#5b21b6" />
                  </radialGradient>
                  <radialGradient id="tokAir" cx="62%" cy="28%" r="85%">
                    <stop offset="0%" stopColor="#ecfccb" />
                    <stop offset="50%" stopColor="#bef264" />
                    <stop offset="100%" stopColor="#4d7c0f" />
                  </radialGradient>
                </defs>

                <g className="tokenomics-chart__slices">
                  {sliceDrawOrder.map((s) => {
                    const isH = hovered === s.key
                    const dim = hovered && !isH
                    const scale = isH ? 1.062 : 1
                    return (
                      <g
                        key={s.key}
                        className={`tokenomics-chart__slice ${isH ? 'tokenomics-chart__slice--hover' : ''}`}
                        transform={`translate(${CX}, ${CY}) scale(${scale}) translate(${-CX}, ${-CY})`}
                        onMouseEnter={() => setHovered(s.key)}
                        style={{
                          cursor: 'pointer',
                          transition: 'opacity 0.34s ease',
                          opacity: dim ? 0.46 : 1,
                        }}
                      >
                        <path
                          d={s.path}
                          fill={s.fill}
                          stroke="#050505"
                          strokeWidth={isH ? 2.85 : 2.25}
                          vectorEffect="non-scaling-stroke"
                          filter={isH ? 'url(#tokSliceGlow)' : undefined}
                        />
                      </g>
                    )
                  })}
                </g>

                <g className="tokenomics-chart__callouts" aria-hidden="true">
                  {slices.map((s) => {
                    const isH = hovered === s.key
                    const dim = hovered && !isH
                    return (
                      <g
                        key={`co-${s.key}`}
                        className={`tokenomics-chart__callout ${isH ? 'tokenomics-chart__callout--hover' : ''} ${dim ? 'tokenomics-chart__callout--dim' : ''}`}
                      >
                        <polyline
                          className="tokenomics-chart__leader"
                          points={s.geom.poly}
                          stroke={s.line}
                          strokeWidth={isH ? 3.15 : 2.35}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx={s.geom.dotX}
                          cy={s.geom.dotY}
                          r={isH ? 6.25 : 5.25}
                          fill={s.accent}
                          stroke="#060606"
                          strokeWidth="1.5"
                          className="tokenomics-chart__leader-dot"
                        />
                      </g>
                    )
                  })}
                </g>

                {slices.map((s) => {
                  const { textX, textY, anchor } = s.geom
                  const isH = hovered === s.key
                  const dim = hovered && !isH
                  return (
                    <text
                      key={`lbl-${s.key}`}
                      className={`tokenomics-chart__label ${isH ? 'tokenomics-chart__label--hover' : ''} ${dim ? 'tokenomics-chart__label--dim' : ''}`}
                      x={textX}
                      y={textY}
                      textAnchor={anchor}
                      dominantBaseline="middle"
                    >
                      <tspan className="tokenomics-chart__label-name" x={textX} dy="-11">
                        {s.shortLabel}
                      </tspan>
                      <tspan className="tokenomics-chart__label-pct" x={textX} dy="22" fill={s.accent}>
                        {s.pct}%
                      </tspan>
                    </text>
                  )
                })}

                <circle cx={CX} cy={CY} r={R_INNER - 2} fill="#030303" stroke="#252525" strokeWidth="2" />
                <circle
                  cx={CX}
                  cy={CY}
                  r={R_INNER + 7}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
                <text
                  className={`tokenomics-chart__logo ${hoveredSlice ? 'tokenomics-chart__logo--accent' : ''}`}
                  x={CX}
                  y={CY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={hoveredSlice ? hoveredSlice.accent : '#ffffff'}
                >
                  N
                </text>
              </svg>
            </div>

            <div className="tokenomics-legend-box">
              <div className="tokenomics-legend" aria-label="Allocation legend">
                {LEGEND_ROWS.map((labels) => (
                  <div key={labels.join('-')} className="tokenomics-legend__row">
                    {labels.map((label) => {
                      const item = allocationByLabel(label)
                      if (!item) return null
                      const isH = hovered === item.label
                      const dim = hovered && !isH
                      const solo = labels.length === 1
                      return (
                        <button
                          key={item.label}
                          type="button"
                          className={`tokenomics-legend__item ${solo ? 'tokenomics-legend__item--solo' : ''} ${isH ? 'tokenomics-legend__item--hover' : ''} ${dim ? 'tokenomics-legend__item--dim' : ''}`}
                          style={{ '--legend-accent': item.accent, color: item.accent }}
                          onMouseEnter={() => setHovered(item.label)}
                          onFocus={() => setHovered(item.label)}
                          onBlur={() => setHovered(null)}
                        >
                          <span className="tokenomics-legend__dot" aria-hidden="true" />
                          <span className="tokenomics-legend__text">
                            <span className="tokenomics-legend__name">{item.label}</span>
                            <span className="tokenomics-legend__pct">({item.pct}%)</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="tokenomics-vesting">
            <h3 className="tokenomics-vesting__title">Lockup &amp; Vesting</h3>
            <ul className="tokenomics-vesting__list">
              {VESTING.map((row) => (
                <li key={row.title} className="tokenomics-vesting__item">
                  <span className={`tokenomics-vesting__bar ${row.barClass}`} aria-hidden="true" />
                  <div className="tokenomics-vesting__text">
                    <strong>{row.title}</strong>
                    <span>{row.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  )
}
