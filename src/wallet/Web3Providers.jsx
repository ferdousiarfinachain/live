import { AutoConnect, ThirdwebProvider } from 'thirdweb/react'
import { supportedWallets, thirdwebClient } from './thirdwebClient'

export default function Web3Providers({ children }) {
  return (
    <ThirdwebProvider>
      {thirdwebClient ? (
        <AutoConnect client={thirdwebClient} wallets={supportedWallets} />
      ) : null}
      {children}
    </ThirdwebProvider>
  )
}
