const LOCK_CLS = 'scroll-locked'

const activeLocks = new Set()
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

function applyLock() {
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

function removeLock() {
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
  if (prevInlineScrollBehavior) {
    html.style.scrollBehavior = prevInlineScrollBehavior
  } else {
    html.style.removeProperty('scroll-behavior')
  }
}

/** Lock page scroll while a modal is open. Returns a release function for the caller. */
export function lockBodyScroll() {
  const token = Symbol('scroll-lock')
  activeLocks.add(token)
  if (activeLocks.size === 1) {
    applyLock()
  }

  let released = false
  return () => {
    if (released || !activeLocks.has(token)) {
      return
    }
    released = true
    activeLocks.delete(token)
    if (activeLocks.size === 0) {
      removeLock()
    }
  }
}

/** Clear any stuck scroll lock (e.g. after HMR or mismatched modal cleanup). */
export function forceUnlockBodyScroll() {
  activeLocks.clear()
  if (
    document.documentElement.classList.contains(LOCK_CLS) ||
    document.body.style.position === 'fixed'
  ) {
    removeLock()
  }
}
