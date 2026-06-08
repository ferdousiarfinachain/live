import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').toString().trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').toString().trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

const TREASURY_NETWORK_KEYS = [
  'ethereum',
  'bsc',
  'arbitrum',
  'base',
  'optimism',
  'polygon',
  'avalanche',
]

export async function recordTreasuryPayment({
  walletAddress,
  amountPaid,
  chainLabel,
  networkKey,
  novexAmount,
}) {
  if (!supabase) {
    return { ok: false, error: 'Supabase is not configured.' }
  }

  const wallet = String(walletAddress ?? '').trim()
  const paid = String(amountPaid ?? '').trim()
  const method = String(chainLabel ?? '').trim().toUpperCase()
  const network = String(networkKey ?? '').trim().toLowerCase()
  const novex = String(novexAmount ?? '').trim()

  if (!wallet || !paid || !method || !network || !novex) {
    return { ok: false, error: 'Confirmed payment details are incomplete.' }
  }

  if (!['ETH', 'USDT', 'USDC'].includes(method)) {
    return { ok: false, error: 'Invalid payment method for database.' }
  }

  if (!TREASURY_NETWORK_KEYS.includes(network)) {
    return { ok: false, error: 'Invalid treasury network for database.' }
  }

  const { error } = await supabase.from('treasury_payments').insert({
    wallet_address: wallet.toLowerCase(),
    amount_paid: paid,
    chain_label: method,
    network_key: network,
    novex_amount: novex,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
