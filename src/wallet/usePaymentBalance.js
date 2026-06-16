import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { isPresaleConfigured } from '../contracts/config.js'
import { isTreasuryPaymentMethod } from '../lib/paymentMethods.js'
import { useTreasuryBalance } from '../treasury/useTreasuryBalance.js'
import { isWalletConfigured } from './walletMetadata.js'
import {
  getCachedSpendableBnbBalance,
  getSpendableBnbBalance,
  warmBnbBalanceCache,
} from './bnbBalance.js'

function formatSpendableBalance(amount) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return ''
  }
  const precision = 8
  const factor = 10 ** precision
  const floored = Math.floor(amount * factor) / factor
  if (floored <= 0) {
    return ''
  }
  return String(floored)
}

export function usePaymentBalance(
  paymentMethod,
  treasuryNetworkKey = '',
  enabled = true,
  treasuryDetectedBalance = 0,
) {
  const { address } = useAccount()
  const walletChainId = useChainId()
  const walletChainIdRef = useRef(walletChainId)
  walletChainIdRef.current = walletChainId
  const [maxPayAmount, setMaxPayAmount] = useState('')
  const [isLoadingMaxPay, setIsLoadingMaxPay] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const isBnb = paymentMethod === 'BNB'
  const isTreasury = isTreasuryPaymentMethod(paymentMethod)
  const treasuryBalance = useTreasuryBalance(
    paymentMethod,
    treasuryNetworkKey,
    treasuryDetectedBalance,
    enabled && isTreasury,
  )

  const refreshMaxPay = useCallback(() => {
    setRefreshKey((value) => value + 1)
  }, [])

  const fetchMaxPayAmount = useCallback(async () => {
    if (!address || !isWalletConfigured || !isBnb || !isPresaleConfigured) {
      return ''
    }

    try {
      const cachedBalance = getCachedSpendableBnbBalance(address)
      if (cachedBalance !== null) {
        return formatSpendableBalance(cachedBalance)
      }
      const balance = await getSpendableBnbBalance(address)
      return formatSpendableBalance(balance)
    } catch {
      return ''
    }
  }, [address, isBnb])

  useEffect(() => {
    if (!enabled || !address || !isWalletConfigured || !isBnb) {
      return undefined
    }

    void warmBnbBalanceCache(address)
    return undefined
  }, [address, enabled, isBnb, walletChainId])

  useEffect(() => {
    if (!enabled || !address || !isWalletConfigured || !isBnb || !isPresaleConfigured) {
      setMaxPayAmount('')
      setIsLoadingMaxPay(false)
      return undefined
    }

    let cancelled = false
    const initialCachedBalance = getCachedSpendableBnbBalance(address)
    if (initialCachedBalance !== null) {
      setMaxPayAmount(formatSpendableBalance(initialCachedBalance))
      setIsLoadingMaxPay(false)
    } else {
      setMaxPayAmount('')
      setIsLoadingMaxPay(true)
    }

    async function loadMaxPay({ forceRefresh = false } = {}) {
      try {
        const cachedBalance = forceRefresh ? null : getCachedSpendableBnbBalance(address)
        let nextMax = ''
        if (cachedBalance !== null) {
          nextMax = formatSpendableBalance(cachedBalance)
        } else {
          const balance = await getSpendableBnbBalance(address, { bypassCache: forceRefresh })
          nextMax = formatSpendableBalance(balance)
        }

        if (!cancelled) {
          setMaxPayAmount(nextMax)
        }
      } catch {
        if (!cancelled) {
          setMaxPayAmount('')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMaxPay(false)
        }
      }
    }

    loadMaxPay()
    const timer = window.setInterval(() => loadMaxPay({ forceRefresh: true }), 15_000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      setIsLoadingMaxPay(false)
    }
  }, [address, enabled, isBnb, refreshKey, walletChainId])

  if (isTreasury) {
    return treasuryBalance
  }

  return {
    maxPayAmount,
    isLoadingMaxPay,
    refreshMaxPay,
    fetchMaxPayAmount,
  }
}
