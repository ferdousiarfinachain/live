import { useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { coinbaseWallet, injected, walletConnect } from '@wagmi/connectors'
import { createConfig, http, WagmiProvider } from 'wagmi'
import { bsc, mainnet } from 'viem/chains'

const projectId =
  import.meta.env.VITE_PROJECT_ID || import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''

const appName = 'CatIQ'
const appLogoUrl = 'https://walletconnect.com/walletconnect-logo.png'
const hasProjectId = typeof projectId === 'string' && projectId.trim().length > 0

const connectors = [
  injected(),
  ...(hasProjectId
    ? [
        walletConnect({
          projectId,
          showQrModal: true,
          qrModalOptions: {
            themeVariables: {
              '--wcm-z-index': '13000',
            },
          },
        }),
      ]
    : []),
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




