import { useEffect, useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { coinbaseWallet, injected, walletConnect } from '@wagmi/connectors'
import { createConfig, http, WagmiProvider, useReconnect } from 'wagmi'
import { bsc, mainnet } from 'viem/chains'
import { isCoarseMobile } from './walletMobile'
import { walletDebugLog } from './walletDebugLog'

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
      showQrModal: !isCoarseMobile(),
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

// #region agent log
walletDebugLog({
  hypothesisId: 'B',
  location: 'Web3Providers.jsx:init',
  message: 'wagmi connectors initialized',
  runId: 'post-fix',
  data: {
    connectorCount: connectors.length,
    connectorIds: connectors.map((c) => c.id),
    connectorNames: connectors.map((c) => c.name),
    hasWalletConnectProjectId: Boolean(walletConnectProjectId),
    showQrModalOnDesktopOnly: true,
  },
})
// #endregion

function WalletSessionEffects() {
  const { reconnectAsync } = useReconnect()

  useEffect(() => {
    const onResume = () => {
      if (document.visibilityState !== 'visible') return
      reconnectAsync().catch(() => {})
    }
    document.addEventListener('visibilitychange', onResume)
    window.addEventListener('pageshow', onResume)
    return () => {
      document.removeEventListener('visibilitychange', onResume)
      window.removeEventListener('pageshow', onResume)
    }
  }, [reconnectAsync])

  return null
}

export default function Web3Providers({ children }) {
  const queryClient = useMemo(() => new QueryClient(), [])

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      <QueryClientProvider client={queryClient}>
        <WalletSessionEffects />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
