import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import {
  detectBestTreasuryNetwork,
  getCachedBestTreasuryNetwork,
} from './scan.js'
import {
  getConfiguredTreasuryNetworks,
  isTreasuryConfigured,
} from './chains.js'
import { warmEthUsdPrice } from './ethPrice.js'
import { isTreasuryPaymentMethod } from '../lib/paymentMethods.js'
import { isWalletConfigured } from '../wallet/walletMetadata.js'

function formatDetectedBalance(balance) {
  if (!Number.isFinite(balance) || balance <= 0) {
    return ''
  }
  const precision = 8
  const factor = 10 ** precision
  const floored = Math.floor(balance * factor) / factor
  return floored > 0 ? String(floored) : ''
}

export function useTreasuryNetworkDetect(paymentMethod, enabled = true) {
  const { address } = useAccount()
  const walletChainId = useChainId()
  const [treasuryNetworkKey, setTreasuryNetworkKey] = useState('')
  const [detectedBalance, setDetectedBalance] = useState(0)
  const [isDetecting, setIsDetecting] = useState(false)
  const detectSeqRef = useRef(0)

  const configuredNetworks = isTreasuryPaymentMethod(paymentMethod)
    ? getConfiguredTreasuryNetworks(paymentMethod)
    : []

  const treasuryReady = isTreasuryPaymentMethod(paymentMethod) && isTreasuryConfigured(paymentMethod)

  const applyDetectResult = useCallback((result) => {
    setTreasuryNetworkKey(result.networkKey)
    setDetectedBalance(result.balance)
  }, [])

  const runDetection = useCallback(
    async ({ forceRefresh = false } = {}) => {
      if (!enabled || !address || !isWalletConfigured || !treasuryReady) {
        return {
          networkKey: configuredNetworks[0] ?? '',
          balance: 0,
        }
      }

      const seq = detectSeqRef.current + 1
      detectSeqRef.current = seq
      setIsDetecting(true)

      try {
        let gotProgress = false
        const result = await detectBestTreasuryNetwork(address, paymentMethod, {
          walletChainId,
          forceRefresh,
          onProgress: (progress) => {
            if (detectSeqRef.current !== seq) {
              return
            }
            applyDetectResult(progress)
            if (!gotProgress) {
              gotProgress = true
              setIsDetecting(false)
            }
          },
        })
        if (detectSeqRef.current === seq) {
          applyDetectResult(result)
        }
        return result
      } catch {
        const fallback = {
          networkKey: configuredNetworks[0] ?? '',
          balance: 0,
        }
        if (detectSeqRef.current === seq) {
          applyDetectResult(fallback)
        }
        return fallback
      } finally {
        if (detectSeqRef.current === seq) {
          setIsDetecting(false)
        }
      }
    },
    [address, applyDetectResult, configuredNetworks, enabled, paymentMethod, treasuryReady, walletChainId],
  )

  useEffect(() => {
    if (!enabled || !isTreasuryPaymentMethod(paymentMethod)) {
      setTreasuryNetworkKey('')
      setDetectedBalance(0)
      setIsDetecting(false)
      return undefined
    }

    if (!address || !isWalletConfigured || !treasuryReady) {
      setTreasuryNetworkKey(configuredNetworks[0] ?? '')
      setDetectedBalance(0)
      setIsDetecting(false)
      return undefined
    }

    const cached = getCachedBestTreasuryNetwork(address, paymentMethod)
    if (cached) {
      applyDetectResult(cached)
      setIsDetecting(false)
    } else {
      setIsDetecting(true)
    }

    if (paymentMethod === 'ETH') {
      void warmEthUsdPrice()
    }

    let cancelled = false
    let gotProgress = Boolean(cached)
    detectBestTreasuryNetwork(address, paymentMethod, {
      walletChainId,
      onProgress: (progress) => {
        if (cancelled) {
          return
        }
        applyDetectResult(progress)
        if (!gotProgress) {
          gotProgress = true
          setIsDetecting(false)
        }
      },
    })
      .then((result) => {
        if (!cancelled) {
          applyDetectResult(result)
        }
      })
      .catch(() => {
        if (!cancelled && !cached) {
          applyDetectResult({
            networkKey: configuredNetworks[0] ?? '',
            balance: 0,
          })
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsDetecting(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [address, applyDetectResult, configuredNetworks, enabled, paymentMethod, treasuryReady, walletChainId])

  return {
    treasuryNetworkKey,
    detectedBalance,
    configuredNetworks,
    treasuryReady,
    isDetecting,
    refreshTreasuryNetwork: runDetection,
  }
}

export function formatTreasuryMaxPay(balance) {
  return formatDetectedBalance(balance)
}
