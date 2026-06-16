import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { appChain } from '../contracts/config.js'
import { isTreasuryPaymentMethod } from '../lib/paymentMethods.js'
import { getTreasuryChain } from '../treasury/chains.js'

function wrongNetworkError(targetChain) {
  return new Error(
    `Wrong network. Approve the switch to ${targetChain.name || 'the required network'} (Chain ID ${targetChain.id}) in your wallet.`,
  )
}

export function usePaymentChainSwitch({
  paymentMethod,
  treasuryNetworkKey = '',
  enabled = true,
}) {
  const { address } = useAccount()
  const walletChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const [isSwitchingChain, setIsSwitchingChain] = useState(false)
  const [switchRejected, setSwitchRejected] = useState(false)
  const autoSwitchAttemptedRef = useRef('')

  const targetChain = useMemo(() => {
    if (paymentMethod === 'BNB') {
      return appChain
    }
    if (isTreasuryPaymentMethod(paymentMethod) && treasuryNetworkKey) {
      return getTreasuryChain(treasuryNetworkKey)
    }
    return null
  }, [paymentMethod, treasuryNetworkKey])

  const isWrongNetwork = Boolean(
    enabled && address && targetChain && walletChainId !== targetChain.id,
  )

  const requestChainSwitch = useCallback(async () => {
    if (!targetChain) {
      throw new Error('Payment network is not configured.')
    }
    if (!switchChainAsync) {
      throw wrongNetworkError(targetChain)
    }
    setSwitchRejected(false)
    setIsSwitchingChain(true)
    try {
      await switchChainAsync({ chainId: targetChain.id })
      setSwitchRejected(false)
      return targetChain
    } catch {
      setSwitchRejected(true)
      throw wrongNetworkError(targetChain)
    } finally {
      setIsSwitchingChain(false)
    }
  }, [switchChainAsync, targetChain])

  useEffect(() => {
    if (!enabled || !address || !targetChain || !switchChainAsync) {
      return undefined
    }
    if (paymentMethod === 'BNB') {
      return undefined
    }
    if (!isTreasuryPaymentMethod(paymentMethod)) {
      return undefined
    }
    if (walletChainId === targetChain.id) {
      autoSwitchAttemptedRef.current = ''
      return undefined
    }

    const attemptKey = `${paymentMethod}:${treasuryNetworkKey}:${targetChain.id}`
    if (autoSwitchAttemptedRef.current === attemptKey) {
      return undefined
    }
    autoSwitchAttemptedRef.current = attemptKey

    let cancelled = false
    setIsSwitchingChain(true)
    switchChainAsync({ chainId: targetChain.id })
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
          setIsSwitchingChain(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    address,
    enabled,
    paymentMethod,
    switchChainAsync,
    targetChain,
    treasuryNetworkKey,
    walletChainId,
  ])

  return {
    targetChain,
    walletChainId: walletChainId ?? null,
    isWrongNetwork,
    isSwitchingChain,
    switchRejected,
    requestChainSwitch,
  }
}
