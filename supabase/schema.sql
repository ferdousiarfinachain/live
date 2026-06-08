-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.treasury_payments (
  wallet_address text not null,
  amount_paid text not null,
  chain_label text not null check (chain_label in ('ETH', 'USDT', 'USDC')),
  novex_amount text,
  network_key text check (
    network_key is null
    or network_key in (
      'ethereum', 'bsc', 'arbitrum', 'base',
      'optimism', 'polygon', 'avalanche'
    )
  )
);

-- chain_label = payment token type (ETH / USDT / USDC)
-- network_key = blockchain network (ethereum, base, arbitrum, etc.)

alter table public.treasury_payments enable row level security;

drop policy if exists "treasury_payments_anon_insert" on public.treasury_payments;
create policy "treasury_payments_anon_insert"
  on public.treasury_payments
  for insert
  to anon, authenticated
  with check (true);

-- Existing database migration (run once in a new SQL query):
-- alter table public.treasury_payments add column if not exists network_key text;
