import { createThirdwebClient } from 'thirdweb'
import { bsc, bscTestnet, ethereum } from 'thirdweb/chains'
import { createWallet } from 'thirdweb/wallets'
import { appChain } from '../contracts/config.js'

const clientId = (import.meta.env.VITE_THIRDWEB_CLIENT_ID || '').toString().trim()

export const thirdwebClient = clientId ? createThirdwebClient({ clientId }) : null

export const appChains = [bscTestnet, bsc, ethereum]
export const defaultChain = appChain

/** Same wallet lineup as thirdweb.com/login (official SDK + ConnectEmbed UI). */
export const supportedWallets = [
  createWallet('io.metamask'),
  createWallet('com.trustwallet.app'),
  createWallet('com.coinbase.wallet'),
  createWallet('com.binance.wallet'),
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
