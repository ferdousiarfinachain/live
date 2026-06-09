import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { chainId, presaleContractAddress } from '../contracts/config.js'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const EMPTY_TIME = { days: 0, hours: 0, minutes: 0, seconds: 0 }

function getTimeLeft(targetMs) {
  const diff = Math.max(0, targetMs - Date.now())
  const days = Math.floor(diff / DAY)
  const hours = Math.floor((diff % DAY) / HOUR)
  const minutes = Math.floor((diff % HOUR) / MINUTE)
  const seconds = Math.floor((diff % MINUTE) / SECOND)

  return { days, hours, minutes, seconds }
}

function readCachedCountdownTarget() {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const cacheKey = `presale-stats:${chainId}:${presaleContractAddress || 'none'}`
    const raw = window.sessionStorage.getItem(cacheKey)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    const value = parsed?.countdownTarget
    return typeof value === 'string' && value ? value : null
  } catch {
    return null
  }
}

function resolveTargetMs(targetDate) {
  const source = targetDate || readCachedCountdownTarget()
  if (!source) {
    return null
  }
  const ms = new Date(source).getTime()
  return Number.isFinite(ms) ? ms : null
}

function CountdownTimer({ targetDate }) {
  const resolvedTargetMs = useMemo(() => resolveTargetMs(targetDate), [targetDate])

  const [timeLeft, setTimeLeft] = useState(() =>
    resolvedTargetMs != null ? getTimeLeft(resolvedTargetMs) : EMPTY_TIME,
  )

  useLayoutEffect(() => {
    if (resolvedTargetMs == null) {
      setTimeLeft(EMPTY_TIME)
      return
    }
    setTimeLeft(getTimeLeft(resolvedTargetMs))
  }, [resolvedTargetMs])

  useEffect(() => {
    if (resolvedTargetMs == null) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setTimeLeft(getTimeLeft(resolvedTargetMs))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [resolvedTargetMs])

  const items = [
    { label: 'DAYS', value: timeLeft.days },
    { label: 'HRS', value: timeLeft.hours },
    { label: 'MIN', value: timeLeft.minutes },
    { label: 'SEC', value: timeLeft.seconds },
  ]

  return (
    <section className="countdown" aria-label="Presale round countdown">
      <div className="countdown__grid">
        {items.map((item) => (
          <div key={item.label} className="countdown__item">
            <strong>{String(item.value).padStart(2, '0')}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default CountdownTimer
