import { useCallback, useEffect, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import {
  detectBestTreasuryNetwork,
  getCachedBestTreasuryNetwork,
} from './scan.js'
import { formatTreasuryMaxPay } from './useTreasuryNetworkDetect.js'
import { isWalletConfigured } from '../wallet/walletMetadata.js'

export function useTreasuryBalance(
  paymentMethod,
  _treasuryNetworkKey,
  detectedBalance = 0,
  enabled = true,
) {
  const { address } = useAccount()
  const walletChainId = useChainId()
  const [maxPayAmount, setMaxPayAmount] = useState('')
  const [isLoadingMaxPay, setIsLoadingMaxPay] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshMaxPay = useCallback(() => {
    setRefreshKey((value) => value + 1)
  }, [])

  const fetchMaxPayAmount = useCallback(async () => {
    if (!address || !isWalletConfigured) {
      return ''
    }

    try {
      let latestFormatted = ''
      const result = await detectBestTreasuryNetwork(address, paymentMethod, {
        walletChainId,
        forceRefresh: true,
        onProgress: (progress) => {
          const formatted = formatTreasuryMaxPay(progress.balance)
          if (formatted) {
            latestFormatted = formatted
            setMaxPayAmount(formatted)
            setIsLoadingMaxPay(false)
          }
        },
      })
      const formatted = formatTreasuryMaxPay(result.balance) || latestFormatted
      setMaxPayAmount(formatted)
      return formatted
    } catch {
      const formatted = formatTreasuryMaxPay(detectedBalance)
      setMaxPayAmount(formatted)
      return formatted
    }
  }, [address, detectedBalance, paymentMethod, walletChainId])

  useEffect(() => {
    if (!enabled || !address || !isWalletConfigured) {
      setMaxPayAmount('')
      setIsLoadingMaxPay(false)
      return undefined
    }

    const cached = getCachedBestTreasuryNetwork(address, paymentMethod)
    const balance = detectedBalance > 0 ? detectedBalance : (cached?.balance ?? 0)
    const formatted = formatTreasuryMaxPay(balance)

    setMaxPayAmount(formatted)
    setIsLoadingMaxPay(!formatted)
    return undefined
  }, [address, detectedBalance, enabled, paymentMethod, refreshKey])

  useEffect(() => {
    if (!enabled || refreshKey === 0 || !address || !isWalletConfigured) {
      return undefined
    }

    let cancelled = false
    setIsLoadingMaxPay(true)

    detectBestTreasuryNetwork(address, paymentMethod, {
      walletChainId,
      forceRefresh: true,
      onProgress: (progress) => {
        if (cancelled) {
          return
        }
        const formatted = formatTreasuryMaxPay(progress.balance)
        setMaxPayAmount(formatted)
        if (formatted) {
          setIsLoadingMaxPay(false)
        }
      },
    })
      .then((result) => {
        if (!cancelled) {
          setMaxPayAmount(formatTreasuryMaxPay(result.balance))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingMaxPay(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [address, enabled, paymentMethod, refreshKey, walletChainId])

  return {
    maxPayAmount,
    isLoadingMaxPay,
    refreshMaxPay,
    fetchMaxPayAmount,
  }
}
