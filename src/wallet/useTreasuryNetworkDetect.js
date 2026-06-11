import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { getConfiguredTreasuryNetworks } from '../contracts/config.js'
import { detectBestTreasuryNetwork } from './treasuryBalanceScan.js'

export function useTreasuryNetworkDetect(paymentMethod, enabled = true) {
  const { address } = useAccount()
  const walletChainId = useChainId()
  const [detectResult, setDetectResult] = useState({
    paymentMethod: '',
    networkKey: '',
    isDetecting: false,
  })
  const detectVersionRef = useRef(0)
  const configuredNetworks = useMemo(
    () => (paymentMethod ? getConfiguredTreasuryNetworks(paymentMethod) : []),
    [paymentMethod],
  )

  useLayoutEffect(() => {
    if (!enabled || !address || !paymentMethod) {
      return
    }
    setDetectResult({ paymentMethod, networkKey: '', isDetecting: true })
  }, [address, enabled, paymentMethod])

  useEffect(() => {
    if (!enabled || !address || !paymentMethod) {
      setDetectResult({ paymentMethod: '', networkKey: '', isDetecting: false })
      return undefined
    }

    const detectVersion = detectVersionRef.current + 1
    detectVersionRef.current = detectVersion
    const method = paymentMethod
    let cancelled = false

    setDetectResult((prev) => ({
      paymentMethod: method,
      networkKey: prev.paymentMethod === method ? prev.networkKey : '',
      isDetecting: true,
    }))

    detectBestTreasuryNetwork(address, method, walletChainId)
      .then((networkKey) => {
        if (!cancelled && detectVersionRef.current === detectVersion) {
          setDetectResult({
            paymentMethod: method,
            networkKey: networkKey || '',
            isDetecting: false,
          })
        }
      })
      .catch(() => {
        if (!cancelled && detectVersionRef.current === detectVersion) {
          setDetectResult({ paymentMethod: method, networkKey: '', isDetecting: false })
        }
      })

    return () => {
      cancelled = true
    }
  }, [address, enabled, paymentMethod, walletChainId])

  const isActiveDetect = detectResult.paymentMethod === paymentMethod
  const isStaleDetect =
    Boolean(paymentMethod) &&
    Boolean(detectResult.paymentMethod) &&
    detectResult.paymentMethod !== paymentMethod
  const suggestedNetworkKey = isActiveDetect ? detectResult.networkKey : ''
  const isDetecting = isStaleDetect || (isActiveDetect && detectResult.isDetecting)
  const treasuryNetworkKey = useMemo(() => {
    if (!paymentMethod || !isActiveDetect) {
      return ''
    }
    if (detectResult.networkKey) {
      return detectResult.networkKey
    }
    if (isDetecting) {
      return ''
    }
    return configuredNetworks[0]?.key ?? ''
  }, [configuredNetworks, detectResult.networkKey, isActiveDetect, isDetecting, paymentMethod])

  return { suggestedNetworkKey, isDetecting, treasuryNetworkKey }
}
