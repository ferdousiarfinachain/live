const LOCK_CLS = 'scroll-locked'

let lockCount = 0
let freezeScrollY = 0
let savedHtmlOverflow = ''
let savedBody = {
  position: '',
  top: '',
  left: '',
  right: '',
  width: '',
  overflow: '',
}

function scrollbarWidth() {
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth)
}

export function lockBodyScroll() {
  if (lockCount === 0) {
    freezeScrollY = window.scrollY
    const w = scrollbarWidth()

    savedHtmlOverflow = document.documentElement.style.overflow
    savedBody = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    }

    document.documentElement.style.setProperty('--scroll-lock-pad', w > 0 ? `${w}px` : '0px')
    document.documentElement.classList.add(LOCK_CLS)
    document.documentElement.style.overflow = 'hidden'

    document.body.style.position = 'fixed'
    document.body.style.top = `-${freezeScrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1
}

export function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount > 0) return

  document.documentElement.classList.remove(LOCK_CLS)
  document.documentElement.style.removeProperty('--scroll-lock-pad')
  document.documentElement.style.overflow = savedHtmlOverflow

  document.body.style.position = savedBody.position
  document.body.style.top = savedBody.top
  document.body.style.left = savedBody.left
  document.body.style.right = savedBody.right
  document.body.style.width = savedBody.width
  document.body.style.overflow = savedBody.overflow

  const html = document.documentElement
  const prevInlineScrollBehavior = html.style.scrollBehavior
  html.style.scrollBehavior = 'auto'
  window.scrollTo(0, freezeScrollY)
  if (prevInlineScrollBehavior) html.style.scrollBehavior = prevInlineScrollBehavior
  else html.style.removeProperty('scroll-behavior')
}
