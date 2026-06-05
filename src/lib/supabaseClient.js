import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').toString().trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').toString().trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export async function recordTreasuryPayment({
  walletAddress,
  amountPaid,
  chainLabel,
  novexAmount,
}) {
  if (!supabase) {
    return { ok: false, error: 'Supabase is not configured.' }
  }

  const wallet = String(walletAddress ?? '').trim()
  const paid = String(amountPaid ?? '').trim()
  const method = String(chainLabel ?? '').trim().toUpperCase()
  const novex = String(novexAmount ?? '').trim()

  if (!wallet || !paid || !method || !novex) {
    return { ok: false, error: 'Confirmed payment details are incomplete.' }
  }

  if (!['ETH', 'USDT', 'USDC'].includes(method)) {
    return { ok: false, error: 'Invalid payment method for database.' }
  }

  const { error } = await supabase.from('treasury_payments').insert({
    wallet_address: wallet.toLowerCase(),
    amount_paid: paid,
    chain_label: method,
    novex_amount: novex,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
