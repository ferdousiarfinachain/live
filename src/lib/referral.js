const REF_STORAGE_KEY = 'novex_ref_id'

function envValue(name) {
  return (import.meta.env[name] ?? '').toString().trim()
}

function isBrowser() {
  return typeof window !== 'undefined'
}

/** Read ?ref= from the current URL and remember it for later buys. */
export function captureReferralFromUrl() {
  if (!isBrowser()) {
    return ''
  }
  try {
    const params = new URLSearchParams(window.location.search)
    const raw = (params.get('ref') ?? '').toString().trim()
    if (!raw) {
      return (window.localStorage.getItem(REF_STORAGE_KEY) ?? '').trim()
    }
    window.localStorage.setItem(REF_STORAGE_KEY, raw)
    return raw
  } catch {
    return ''
  }
}

export function getStoredReferral() {
  const fromUrl = captureReferralFromUrl()
  if (fromUrl) {
    return fromUrl
  }
  if (!isBrowser()) {
    return ''
  }
  try {
    return (window.localStorage.getItem(REF_STORAGE_KEY) ?? '').trim()
  } catch {
    return ''
  }
}

/**
 * Inserts a row into referral_commission when a ?ref= visitor completes a payment.
 * No-op (returns false) when there is no stored ref or Supabase is not configured.
 */
export async function recordReferralCommission({
  walletAddress,
  amountPaid,
  chainLabel,
  novexAmount,
  networkKey,
}) {
  const refId = getStoredReferral()
  if (!refId) {
    return false
  }

  const url = envValue('VITE_SUPABASE_URL')
  const anonKey = envValue('VITE_SUPABASE_ANON_KEY')
  if (!url || !anonKey) {
    return false
  }

  const response = await fetch(`${url}/rest/v1/referral_commission`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      ref_id: refId,
      wallet_address: walletAddress,
      amount_paid: String(amountPaid),
      chain_label: chainLabel,
      novex_amount: novexAmount ? String(novexAmount) : null,
      network_key: networkKey ?? null,
    }),
  })

  return response.ok
}

if (isBrowser()) {
  captureReferralFromUrl()
}
