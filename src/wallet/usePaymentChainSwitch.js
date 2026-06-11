import { useCallback, useMemo, useState } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { appChain } from '../contracts/config.js'
import { getTreasuryChain } from '../contracts/treasuryChains.js'
import { isTreasuryPaymentMethod } from '../lib/paymentMethods.js'

function wrongNetworkError(targetChain) {
  return new Error(
    `Wrong network. Approve the switch to ${targetChain.name || 'the required network'} (Chain ID ${targetChain.id}) in your wallet.`,
  )
}

function resolveTargetChain(paymentMethod, treasuryNetworkKey) {
  if (paymentMethod === 'BNB') {
    return appChain
  }
  if (isTreasuryPaymentMethod(paymentMethod) && treasuryNetworkKey) {
    return getTreasuryChain(treasuryNetworkKey)
  }
  return null
}

export function usePaymentChainSwitch({ paymentMethod, treasuryNetworkKey = '', enabled = true }) {
  const { address } = useAccount()
  const walletChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const [isSwitchingChain, setIsSwitchingChain] = useState(false)
  const [switchRejected, setSwitchRejected] = useState(false)

  const targetChain = useMemo(
    () => resolveTargetChain(paymentMethod, treasuryNetworkKey),
    [paymentMethod, treasuryNetworkKey],
  )

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

  return {
    targetChain,
    walletChainId: walletChainId ?? null,
    isWrongNetwork,
    isSwitchingChain,
    switchRejected,
    requestChainSwitch,
  }
}
