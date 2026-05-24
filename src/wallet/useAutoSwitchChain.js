import { useEffect, useRef, useState } from 'react'
import { useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react'
import { appChain } from '../contracts/config.js'

function wrongNetworkError() {
  return new Error(
    `Wrong network. Approve the switch to ${appChain.name || 'BSC Testnet'} (Chain ID ${appChain.id}) in your wallet.`,
  )
}

export async function ensureAppChain({ wallet, walletChain, switchChain }) {
  if (!wallet) {
    throw new Error('Connect your wallet first.')
  }
  if (walletChain?.id === appChain.id) {
    return
  }
  try {
    await switchChain(appChain)
  } catch {
    throw wrongNetworkError()
  }
  const activeChain = wallet.getChain?.()
  if (activeChain?.id && activeChain.id !== appChain.id) {
    throw wrongNetworkError()
  }
}

export function useAutoSwitchChain(enabled = true) {
  const account = useActiveAccount()
  const walletChain = useActiveWalletChain()
  const switchChain = useSwitchActiveWalletChain()
  const [isSwitchingChain, setIsSwitchingChain] = useState(false)
  const [switchRejected, setSwitchRejected] = useState(false)
  const inFlightRef = useRef(false)

  const isWrongNetwork = Boolean(enabled && account?.address && walletChain?.id !== appChain.id)

  useEffect(() => {
    if (!enabled || !account?.address) {
      setIsSwitchingChain(false)
      setSwitchRejected(false)
      inFlightRef.current = false
      return undefined
    }

    if (walletChain?.id === appChain.id) {
      setIsSwitchingChain(false)
      setSwitchRejected(false)
      inFlightRef.current = false
      return undefined
    }

    if (inFlightRef.current || switchRejected) {
      return undefined
    }

    let cancelled = false
    inFlightRef.current = true
    setIsSwitchingChain(true)

    switchChain(appChain)
      .then(() => {
        if (!cancelled) {
          setSwitchRejected(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSwitchRejected(true)
        }
      })
      .finally(() => {
        if (!cancelled) {
          inFlightRef.current = false
          setIsSwitchingChain(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [account?.address, enabled, switchChain, walletChain?.id])

  async function requestChainSwitch() {
    setSwitchRejected(false)
    inFlightRef.current = true
    setIsSwitchingChain(true)
    try {
      await switchChain(appChain)
      setSwitchRejected(false)
    } catch {
      setSwitchRejected(true)
      throw wrongNetworkError()
    } finally {
      inFlightRef.current = false
      setIsSwitchingChain(false)
    }
  }

  return {
    appChain,
    isWrongNetwork,
    isSwitchingChain,
    switchRejected,
    requestChainSwitch,
  }
}
