import { useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { coinbaseWallet, injected, walletConnect } from '@wagmi/connectors'
import { bsc, mainnet } from 'viem/chains'
import { WagmiProvider } from 'wagmi'

const projectId =
  import.meta.env.VITE_PROJECT_ID || import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''

const metadata = {
  name: 'CatIQ',
  description: 'CatIQ Presale Wallet Connection',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://example.com',
  icons: ['https://walletconnect.com/walletconnect-logo.png'],
}

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

const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet, bsc],
  projectId,
  connectors,
})

let appKitModal = null
if (hasProjectId) {
  try {
    appKitModal = createAppKit({
      adapters: [wagmiAdapter],
      projectId,
      networks: [mainnet, bsc],
      metadata,
      manualWCControl: true,
      headless: true,
      themeMode: 'dark',
      themeVariables: {
        '--w3m-accent': '#6f8cff',
        '--w3m-color-bg-1': '#0a1022',
        '--w3m-color-bg-2': '#111a34',
        '--w3m-color-fg-1': '#f6f7fb',
        '--w3m-border-radius-master': '18px',
        '--w3m-z-index': '13000',
        '--apkt-z-index': '13000',
      },
      features: {
        email: false,
        socials: false,
        onramp: false,
        swaps: false,
        send: false,
        receive: false,
        analytics: false,
        history: false,
        reownBranding: false,
      },
    })
  } catch (error) {
    console.error('AppKit initialization failed:', error)
  }
}

export { appKitModal }

export default function Web3Providers({ children }) {
  const queryClient = useMemo(() => new QueryClient(), [])

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}




