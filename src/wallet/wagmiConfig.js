import { QueryClient } from '@tanstack/react-query'
import { metaMask } from '@wagmi/connectors'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { wagmiChains } from './chains.js'
import { appMetadata, getAppMetadata, reownProjectId } from './walletMetadata.js'

export const queryClient = new QueryClient()

function createMetaMaskConnector() {
  const { name, url } = getAppMetadata()

  return metaMask({
    dappMetadata: {
      name,
      url,
    },
  })
}

export const wagmiAdapter = new WagmiAdapter({
  networks: wagmiChains,
  projectId: reownProjectId || '00000000000000000000000000000000',
  ssr: false,
  connectors: [createMetaMaskConnector()],
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

export { appMetadata, reownProjectId }
