import { QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import './reownAppKit.js'
import { queryClient, wagmiConfig } from './wagmiConfig.js'

export default function Web3Providers({ children }) {
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
