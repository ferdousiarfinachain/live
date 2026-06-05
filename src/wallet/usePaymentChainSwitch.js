import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react'
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
  const account = useActiveAccount()
  const walletChain = useActiveWalletChain()
  const switchChain = useSwitchActiveWalletChain()
  const [isSwitchingChain, setIsSwitchingChain] = useState(false)
  const [switchRejected, setSwitchRejected] = useState(false)
  const inFlightRef = useRef(false)

  const targetChain = useMemo(
    () => resolveTargetChain(paymentMethod, treasuryNetworkKey),
    [paymentMethod, treasuryNetworkKey],
  )

  const isWrongNetwork = Boolean(
    enabled && account?.address && targetChain && walletChain?.id !== targetChain.id,
  )

  const requestChainSwitch = useCallback(async () => {
    if (!targetChain) {
      throw new Error('Payment network is not configured.')
    }
    setSwitchRejected(false)
    inFlightRef.current = true
    setIsSwitchingChain(true)
    try {
      await switchChain(targetChain)
      setSwitchRejected(false)
      return targetChain
    } catch {
      setSwitchRejected(true)
      throw wrongNetworkError(targetChain)
    } finally {
      inFlightRef.current = false
      setIsSwitchingChain(false)
    }
  }, [switchChain, targetChain])

  useEffect(() => {
    if (!enabled || !account?.address || !targetChain) {
      setIsSwitchingChain(false)
      setSwitchRejected(false)
      inFlightRef.current = false
      return undefined
    }

    if (walletChain?.id === targetChain.id) {
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

    switchChain(targetChain)
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
  }, [
    account?.address,
    enabled,
    switchChain,
    switchRejected,
    targetChain,
    walletChain?.id,
  ])

  useEffect(() => {
    setSwitchRejected(false)
  }, [paymentMethod, treasuryNetworkKey, targetChain?.id])

  return {
    targetChain,
    walletChainId: walletChain?.id ?? null,
    isWrongNetwork,
    isSwitchingChain,
    switchRejected,
    requestChainSwitch,
  }
}
