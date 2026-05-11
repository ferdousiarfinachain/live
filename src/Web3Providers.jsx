import { useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { coinbaseWallet, injected } from '@wagmi/connectors'
import { createConfig, http, WagmiProvider } from 'wagmi'
import { bsc, mainnet } from 'viem/chains'

const appName = 'CatIQ'
const appLogoUrl = 'https://walletconnect.com/walletconnect-logo.png'

const connectors = [
  injected(),
  coinbaseWallet({
    appName,
    appLogoUrl,
    preference: 'all',
  }),
]

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




