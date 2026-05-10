import { useEffect, useRef } from 'react'
import './StarfieldBackground.css'

const BASE_DENSITY = 0.00009
const MIN_STARS = 120
const MAX_STARS = 380
const PARALLAX_MAX_SHIFT = 22

const STAR_LAYERS = [
  { key: 'small', ratio: 0.58, radius: [0.9, 1.6], parallax: 0.35, alphaBoost: 0 },
  { key: 'medium', ratio: 0.3, radius: [1.6, 2.6], parallax: 0.7, alphaBoost: 0.1 },
  { key: 'large', ratio: 0.12, radius: [2.6, 4], parallax: 1.15, alphaBoost: 0.2 },
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function createStar(width, height, layer) {
  const depth = Math.random()
  const speedFactor = 0.14 + depth * 0.62
  const [minR, maxR] = layer.radius
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    r: minR + Math.random() * (maxR - minR),
    alpha: 0.2 + Math.random() * 0.75 + layer.alphaBoost,
    twinkleSpeed: 0.35 + Math.random() * 1.2,
    twinkleOffset: Math.random() * Math.PI * 2,
    vx: (Math.random() - 0.5) * 0.05 * speedFactor,
    vy: (Math.random() - 0.5) * 0.05 * speedFactor,
    depth,
    layerParallax: layer.parallax,
    sparkle: layer.key === 'large' || (layer.key === 'medium' && Math.random() > 0.75),
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.9,
  }
}

function drawSparkle(ctx, x, y, radius, alpha, rotation) {
  const spike = radius * 2.3
  ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.7).toFixed(3)})`
  ctx.lineWidth = Math.max(0.7, radius * 0.22)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.beginPath()
  ctx.moveTo(-spike, 0)
  ctx.lineTo(spike, 0)
  ctx.moveTo(0, -spike)
  ctx.lineTo(0, spike)
  ctx.moveTo(-spike * 0.65, -spike * 0.65)
  ctx.lineTo(spike * 0.65, spike * 0.65)
  ctx.moveTo(spike * 0.65, -spike * 0.65)
  ctx.lineTo(-spike * 0.65, spike * 0.65)
  ctx.stroke()
  ctx.restore()
}

function StarfieldBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return undefined

    let width = 0
    let height = 0
    let dpr = 1
    let stars = []
    let rafId = 0
    let lastTs = 0
    let targetPointerX = 0
    let targetPointerY = 0
    let pointerX = 0
    let pointerY = 0

    const buildStars = () => {
      const targetCount = clamp(Math.floor(width * height * BASE_DENSITY), MIN_STARS, MAX_STARS)
      stars = STAR_LAYERS.flatMap((layer, index) => {
        const count =
          index === STAR_LAYERS.length - 1
            ? Math.max(1, targetCount - Math.floor(targetCount * (STAR_LAYERS[0].ratio + STAR_LAYERS[1].ratio)))
            : Math.max(1, Math.floor(targetCount * layer.ratio))
        return Array.from({ length: count }, () => createStar(width, height, layer))
      })
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildStars()
    }

    const draw = (timestamp) => {
      const delta = lastTs ? Math.min((timestamp - lastTs) / 1000, 0.05) : 0.016
      lastTs = timestamp
      pointerX += (targetPointerX - pointerX) * 0.06
      pointerY += (targetPointerY - pointerY) * 0.06

      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, height)

      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i]
        star.x += star.vx * (20 + star.depth * 30) * delta
        star.y += star.vy * (20 + star.depth * 30) * delta
        star.rotation += star.rotationSpeed * delta

        if (star.x < -2) star.x = width + 2
        if (star.x > width + 2) star.x = -2
        if (star.y < -2) star.y = height + 2
        if (star.y > height + 2) star.y = -2

        const twinkle = 0.58 + 0.42 * Math.sin(timestamp * 0.001 * star.twinkleSpeed + star.twinkleOffset)
        const alpha = clamp(star.alpha * twinkle, 0.05, 1)
        const parallaxX = pointerX * star.layerParallax
        const parallaxY = pointerY * star.layerParallax
        const drawX = star.x + parallaxX
        const drawY = star.y + parallaxY

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(drawX, drawY, star.r, 0, Math.PI * 2)
        ctx.fill()

        if (star.sparkle && alpha > 0.2) {
          drawSparkle(ctx, drawX, drawY, star.r, alpha, star.rotation)
        }
      }

      rafId = window.requestAnimationFrame(draw)
    }

    resize()
    rafId = window.requestAnimationFrame(draw)

    let resizeTimer = 0
    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(resize, 120)
    }
    window.addEventListener('resize', onResize)

    const onPointerMove = (event) => {
      const nx = event.clientX / width - 0.5
      const ny = event.clientY / height - 0.5
      targetPointerX = nx * PARALLAX_MAX_SHIFT
      targetPointerY = ny * PARALLAX_MAX_SHIFT
    }

    const onPointerLeave = () => {
      targetPointerX = 0
      targetPointerY = 0
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave)

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(resizeTimer)
    }
  }, [])

  return (
    <div className="starfield" aria-hidden="true">
      <canvas ref={canvasRef} className="starfield__canvas" />
    </div>
  )
}

export default StarfieldBackground
