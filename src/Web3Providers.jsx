import { useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { coinbaseWallet, injected, walletConnect } from '@wagmi/connectors'
import { createConfig, http, WagmiProvider } from 'wagmi'
import { bsc, mainnet } from 'viem/chains'

const appName = 'Novex Labs'
const appLogoUrl = 'https://walletconnect.com/walletconnect-logo.png'

const walletMetadata = {
  name: appName,
  description: 'Connect your wallet to Novex Labs',
  url:
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:5173',
  icons: [appLogoUrl],
}

const walletConnectProjectId = (
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ||
  import.meta.env.VITE_PROJECT_ID ||
  ''
)
  .toString()
  .trim()

const connectors = [
  injected(),
  coinbaseWallet({
    appName,
    appLogoUrl,
    preference: 'all',
  }),
]

if (walletConnectProjectId) {
  connectors.push(
    walletConnect({
      projectId: walletConnectProjectId,
      showQrModal: true,
      metadata: walletMetadata,
    }),
  )
}

const wagmiConfig = createConfig({
  chains: [mainnet, bsc],
  connectors,
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
  },
})

export default function Web3Providers({ children }) {
  const queryClient = useMemo(() => new QueryClient(), [])

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}




