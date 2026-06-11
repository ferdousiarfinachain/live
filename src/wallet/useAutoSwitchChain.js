import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { appChain } from '../contracts/config.js'
import { getTreasuryChain } from '../contracts/treasuryChains.js'

function wrongNetworkError(targetChain = appChain) {
  return new Error(
    `Wrong network. Approve the switch to ${targetChain.name || 'the required network'} (Chain ID ${targetChain.id}) in your wallet.`,
  )
}

export async function ensureTreasuryChain(networkKey, { chainId, switchChain }) {
  const targetChain = getTreasuryChain(networkKey)
  if (!targetChain) {
    throw new Error('Selected network is not configured.')
  }
  if (!switchChain) {
    throw new Error('Connect your wallet first.')
  }
  if (chainId === targetChain.id) {
    return targetChain
  }
  try {
    await switchChain({ chainId: targetChain.id })
  } catch {
    throw wrongNetworkError(targetChain)
  }
  return targetChain
}

export async function ensureAppChain({ chainId, switchChain }) {
  if (!switchChain) {
    throw new Error('Connect your wallet first.')
  }
  if (chainId === appChain.id) {
    return appChain
  }
  try {
    await switchChain({ chainId: appChain.id })
  } catch {
    throw wrongNetworkError(appChain)
  }
  return appChain
}

/** @deprecated Prefer usePaymentChainSwitch in the presale panel. */
export function useAutoSwitchChain(enabled = true) {
  const { address } = useAccount()
  const walletChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const [isSwitchingChain, setIsSwitchingChain] = useState(false)
  const [switchRejected, setSwitchRejected] = useState(false)
  const inFlightRef = useRef(false)

  const isWrongNetwork = Boolean(enabled && address && walletChainId !== appChain.id)

  useEffect(() => {
    if (!enabled || !address) {
      setIsSwitchingChain(false)
      setSwitchRejected(false)
      inFlightRef.current = false
      return undefined
    }

    if (walletChainId === appChain.id) {
      setIsSwitchingChain(false)
      setSwitchRejected(false)
      inFlightRef.current = false
      return undefined
    }

    if (inFlightRef.current || switchRejected || !switchChainAsync) {
      return undefined
    }

    let cancelled = false
    inFlightRef.current = true
    setIsSwitchingChain(true)

    switchChainAsync({ chainId: appChain.id })
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
  }, [address, enabled, switchChainAsync, switchRejected, walletChainId])

  const requestChainSwitch = useCallback(async () => {
    if (!switchChainAsync) {
      throw wrongNetworkError(appChain)
    }
    setSwitchRejected(false)
    inFlightRef.current = true
    setIsSwitchingChain(true)
    try {
      await switchChainAsync({ chainId: appChain.id })
      setSwitchRejected(false)
    } catch {
      setSwitchRejected(true)
      throw wrongNetworkError(appChain)
    } finally {
      inFlightRef.current = false
      setIsSwitchingChain(false)
    }
  }, [switchChainAsync])

  return {
    appChain,
    isWrongNetwork,
    isSwitchingChain,
    switchRejected,
    requestChainSwitch,
  }
}
