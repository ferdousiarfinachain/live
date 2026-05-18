import { createThirdwebClient } from 'thirdweb'
import { bsc, ethereum } from 'thirdweb/chains'
import { createWallet, inAppWallet } from 'thirdweb/wallets'

const clientId = (import.meta.env.VITE_THIRDWEB_CLIENT_ID || '').toString().trim()

export const thirdwebClient = clientId ? createThirdwebClient({ clientId }) : null

export const appChains = [ethereum, bsc]
export const defaultChain = bsc

/** Same wallet lineup as thirdweb.com/login (official SDK + ConnectEmbed UI). */
export const supportedWallets = [
  // inAppWallet({
  //   // auth: {
  //   //   options: ['google', 'apple', 'facebook', 'github', 'email', 'passkey'],
  //   // },
  // }),
  createWallet('io.metamask'),
  createWallet('com.trustwallet.app'),
  createWallet('com.coinbase.wallet'),
  createWallet('com.binance.wallet'),
  createWallet('io.rabby'),
  createWallet('me.rainbow'),
  createWallet('com.okex.wallet'),
]

export const appMetadata = {
  name: 'Novex Labs',
  url:
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:5173',
  description: 'Connect your wallet to Novex Labs',
  logoUrl: 'https://walletconnect.com/walletconnect-logo.png',
}
