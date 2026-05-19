import { useActiveAccount, useActiveWallet, useDisconnect } from 'thirdweb/react'

export function useWalletSession() {
  const account = useActiveAccount()
  const activeWallet = useActiveWallet()
  const { disconnect } = useDisconnect()

  const address = account?.address
  const isConnected = Boolean(address)
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''

  function handleDisconnect() {
    if (activeWallet) {
      disconnect(activeWallet)
    }
  }

  return {
    address,
    isConnected,
    shortAddress,
    handleDisconnect,
  }
}
