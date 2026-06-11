import { QueryClient } from '@tanstack/react-query'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { wagmiChains } from './chains.js'
import { appMetadata, reownProjectId } from './walletMetadata.js'

export const queryClient = new QueryClient()

export const wagmiAdapter = new WagmiAdapter({
  networks: wagmiChains,
  projectId: reownProjectId || '00000000000000000000000000000000',
  ssr: false,
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

export { appMetadata, reownProjectId }
