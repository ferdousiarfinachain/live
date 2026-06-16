import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
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
      const result = await detectBestTreasuryNetwork(address, paymentMethod, {
        forceRefresh: true,
      })
      const formatted = formatTreasuryMaxPay(result.balance)
      setMaxPayAmount(formatted)
      return formatted
    } catch {
      const formatted = formatTreasuryMaxPay(detectedBalance)
      setMaxPayAmount(formatted)
      return formatted
    }
  }, [address, detectedBalance, paymentMethod])

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

    detectBestTreasuryNetwork(address, paymentMethod, { forceRefresh: true })
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
  }, [address, enabled, paymentMethod, refreshKey])

  return {
    maxPayAmount,
    isLoadingMaxPay,
    refreshMaxPay,
    fetchMaxPayAmount,
  }
}
