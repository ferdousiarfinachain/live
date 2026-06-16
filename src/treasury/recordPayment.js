function envValue(name) {
  return (import.meta.env[name] ?? '').toString().trim()
}

export function isSupabaseConfigured() {
  return Boolean(envValue('VITE_SUPABASE_URL') && envValue('VITE_SUPABASE_ANON_KEY'))
}

export async function recordTreasuryPayment({
  walletAddress,
  amountPaid,
  chainLabel,
  novexAmount,
  networkKey,
}) {
  const url = envValue('VITE_SUPABASE_URL')
  const anonKey = envValue('VITE_SUPABASE_ANON_KEY')
  if (!url || !anonKey) {
    return false
  }

  const response = await fetch(`${url}/rest/v1/treasury_payments`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      wallet_address: walletAddress,
      amount_paid: String(amountPaid),
      chain_label: chainLabel,
      novex_amount: novexAmount ? String(novexAmount) : null,
      network_key: networkKey,
    }),
  })

  return response.ok
}
