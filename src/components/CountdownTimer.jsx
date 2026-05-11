import { useEffect, useMemo, useState } from 'react'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function getTimeLeft(targetMs) {
  const diff = Math.max(0, targetMs - Date.now())
  const days = Math.floor(diff / DAY)
  const hours = Math.floor((diff % DAY) / HOUR)
  const minutes = Math.floor((diff % HOUR) / MINUTE)
  const seconds = Math.floor((diff % MINUTE) / SECOND)

  return { days, hours, minutes, seconds }
}

function CountdownTimer({ targetDate }) {
  const [defaultTargetMs] = useState(() => Date.now() + 365 * DAY)
  const resolvedTargetMs = useMemo(
    () => (targetDate ? new Date(targetDate).getTime() : defaultTargetMs),
    [defaultTargetMs, targetDate],
  )

  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(resolvedTargetMs))

  useEffect(() => {
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
