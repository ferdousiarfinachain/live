/** https://walletguide.reown.com — MetaMask, Trust, Coinbase, Binance */
export const WALLET_ORDER = [
  'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
  '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
  'd0ca99ff52b99abc48743dad0f7fc891e041be73574f7fac4afe5d4bb83845c8',
  '8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4',
]

export const WALLET_SELECTOR_TEST_IDS = new Set(
  WALLET_ORDER.map((id) => `wallet-selector-${id}`),
)

export const WALLET_NAMES = new Set([
  'MetaMask',
  'Trust Wallet',
  'Coinbase Wallet',
  'Binance Wallet',
  'Binance Web3 Wallet',
])
