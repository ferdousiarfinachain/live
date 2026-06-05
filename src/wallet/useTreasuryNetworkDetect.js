import { useEffect, useRef, useState } from 'react'
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react'
import { isTreasuryPaymentMethod } from '../lib/paymentMethods.js'
import { detectBestTreasuryNetwork } from './treasuryBalanceScan.js'

export function useTreasuryNetworkDetect(paymentMethod, enabled = true) {
  const account = useActiveAccount()
  const walletChain = useActiveWalletChain()
  const [suggestedNetworkKey, setSuggestedNetworkKey] = useState('')
  const [isDetectingNetwork, setIsDetectingNetwork] = useState(false)
  const detectVersionRef = useRef(0)

  useEffect(() => {
    if (!enabled || !isTreasuryPaymentMethod(paymentMethod) || !account?.address) {
      setSuggestedNetworkKey('')
      setIsDetectingNetwork(false)
      return undefined
    }

    const detectVersion = detectVersionRef.current + 1
    detectVersionRef.current = detectVersion
    let cancelled = false
    setIsDetectingNetwork(true)

    detectBestTreasuryNetwork(account.address, paymentMethod, walletChain?.id)
      .then((networkKey) => {
        if (!cancelled && detectVersionRef.current === detectVersion) {
          setSuggestedNetworkKey(networkKey)
        }
      })
      .catch(() => {
        if (!cancelled && detectVersionRef.current === detectVersion) {
          setSuggestedNetworkKey('')
        }
      })
      .finally(() => {
        if (!cancelled && detectVersionRef.current === detectVersion) {
          setIsDetectingNetwork(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [account?.address, enabled, paymentMethod, walletChain?.id])

  return {
    suggestedNetworkKey,
    isDetectingNetwork,
  }
}
