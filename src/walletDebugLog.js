const DEBUG_SESSION = 'd00b37'
const INGEST_URL =
  'http://127.0.0.1:7567/ingest/705bf84b-743f-4803-b78a-47d14e0b36b0'
const STORAGE_KEY = 'wallet_debug_d00b37'

function isWalletDebugUiEnabled() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('wallet_debug')
}

function ensureDebugPanel() {
  if (!isWalletDebugUiEnabled() || typeof document === 'undefined') return
  let panel = document.getElementById('wallet-debug-panel')
  if (panel) return

  panel = document.createElement('pre')
  panel.id = 'wallet-debug-panel'
  panel.style.cssText =
    'position:fixed;bottom:0;left:0;right:0;z-index:99999;max-height:38vh;overflow:auto;margin:0;padding:8px;font:11px/1.35 monospace;background:#111;color:#9f9;border-top:1px solid #393;pointer-events:none;white-space:pre-wrap;word-break:break-word;'
  document.body.appendChild(panel)
}

function refreshDebugPanel() {
  if (!isWalletDebugUiEnabled() || typeof window === 'undefined') return
  ensureDebugPanel()
  const panel = document.getElementById('wallet-debug-panel')
  if (!panel) return
  const lines = (window.__walletDebugLogs || []).slice(-12)
  panel.textContent = lines.map((e) => `${e.hypothesisId} ${e.message} ${JSON.stringify(e.data)}`).join('\n')
}

export function walletDebugLog({
  hypothesisId,
  location,
  message,
  data = {},
  runId = 'pre-fix',
}) {
  const entry = {
    sessionId: DEBUG_SESSION,
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
    runId,
  }

  if (typeof window !== 'undefined') {
    window.__walletDebugLogs = [...(window.__walletDebugLogs || []), entry].slice(-40)
    try {
      const prev = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...prev, entry].slice(-40)))
    } catch {
      // ignore storage errors
    }
    refreshDebugPanel()
  }

  // #region agent log
  fetch(INGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION,
    },
    body: JSON.stringify(entry),
  }).catch(() => {})
  // #endregion
}

export function getEthereumSnapshot() {
  const eth = typeof window !== 'undefined' ? window.ethereum : undefined
  return {
    hasEthereum: Boolean(eth),
    isMetaMask: Boolean(eth?.isMetaMask),
    isTrust: Boolean(eth?.isTrust),
    isCoinbaseWallet: Boolean(eth?.isCoinbaseWallet),
    providerCount: Array.isArray(eth?.providers) ? eth.providers.length : eth ? 1 : 0,
  }
}

export function isMobileUserAgent() {
  if (typeof navigator === 'undefined') return false
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
}
