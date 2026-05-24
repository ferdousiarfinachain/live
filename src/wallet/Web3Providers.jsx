import { AutoConnect, ThirdwebProvider } from 'thirdweb/react'
import { isPresaleConfigured } from '../contracts/config.js'
import { supportedWallets, thirdwebClient } from './thirdwebClient'
import { useAutoSwitchChain } from './useAutoSwitchChain.js'

function AutoSwitchChainManager() {
  useAutoSwitchChain(isPresaleConfigured)
  return null
}

export default function Web3Providers({ children }) {
  return (
    <ThirdwebProvider>
      {thirdwebClient ? (
        <AutoConnect client={thirdwebClient} wallets={supportedWallets} />
      ) : null}
      <AutoSwitchChainManager />
      {children}
    </ThirdwebProvider>
  )
}
