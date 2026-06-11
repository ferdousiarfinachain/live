import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { isPresaleConfigured } from '../contracts/config.js'
import { isTreasuryMethodConfigured } from '../contracts/treasuryChains.js'
import { isTreasuryPaymentMethod } from '../lib/paymentMethods.js'
import { isWalletConfigured } from './walletMetadata.js'
import {
  getBestTreasuryBalance,
  getCachedBestTreasuryBalance,
  getCachedSpendableBalance,
  getSpendableBnbBalance,
  warmPaymentBalanceCache,
} from './treasuryBalanceScan.js'

function paymentMethodPrecision(paymentMethod) {
  if (paymentMethod === 'ETH' || paymentMethod === 'BNB') {
    return 8
  }
  return 6
}

function formatSpendableBalance(amount, paymentMethod) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return ''
  }
  const precision = paymentMethodPrecision(paymentMethod)
  const factor = 10 ** precision
  const floored = Math.floor(amount * factor) / factor
  if (floored <= 0) {
    return ''
  }
  return String(floored)
}

function readCachedTreasuryMax(address, paymentMethod, walletChainId) {
  const cachedBalance = getCachedBestTreasuryBalance(address, paymentMethod, walletChainId)
  if (cachedBalance === null) {
    return ''
  }
  return formatSpendableBalance(cachedBalance, paymentMethod)
}

export function usePaymentBalance(paymentMethod, treasuryNetworkKey = '', enabled = true) {
  const { address } = useAccount()
  const walletChainId = useChainId()
  const treasuryMethod = isTreasuryPaymentMethod(paymentMethod)
  const maxPayReloadKey = treasuryMethod ? '' : treasuryNetworkKey
  const walletChainIdRef = useRef(walletChainId)
  walletChainIdRef.current = walletChainId
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

    const methodReady = treasuryMethod
      ? isTreasuryMethodConfigured(paymentMethod)
      : isPresaleConfigured
    if (!methodReady) {
      return ''
    }

    const chainId = walletChainIdRef.current

    try {
      if (paymentMethod === 'BNB') {
        const cachedBalance = getCachedSpendableBalance(
          address,
          paymentMethod,
          chainId,
          treasuryNetworkKey,
        )
        if (cachedBalance !== null) {
          return formatSpendableBalance(cachedBalance, paymentMethod)
        }
        const balance = await getSpendableBnbBalance(address)
        return formatSpendableBalance(balance, paymentMethod)
      }
      if (treasuryMethod) {
        const cachedMax = readCachedTreasuryMax(address, paymentMethod, chainId)
        if (cachedMax) {
          return cachedMax
        }
        const { balance } = await getBestTreasuryBalance(
          address,
          paymentMethod,
          chainId,
        )
        return formatSpendableBalance(balance, paymentMethod)
      }
    } catch {
      return ''
    }

    return ''
  }, [address, paymentMethod, treasuryMethod, treasuryNetworkKey])

  useEffect(() => {
    if (!enabled || !address || !isWalletConfigured) {
      return undefined
    }

    void warmPaymentBalanceCache(address, walletChainId)
    return undefined
  }, [address, enabled, walletChainId])

  useEffect(() => {
    const methodReady = treasuryMethod
      ? isTreasuryMethodConfigured(paymentMethod)
      : isPresaleConfigured

    if (!enabled || !address || !isWalletConfigured || !methodReady) {
      setMaxPayAmount('')
      setIsLoadingMaxPay(false)
      return undefined
    }

    let cancelled = false
    if (!treasuryMethod) {
      const initialCachedBalance = getCachedSpendableBalance(
        address,
        paymentMethod,
        walletChainId,
        treasuryNetworkKey,
      )
      if (initialCachedBalance !== null) {
        setMaxPayAmount(formatSpendableBalance(initialCachedBalance, paymentMethod))
        setIsLoadingMaxPay(false)
      } else {
        setMaxPayAmount('')
        setIsLoadingMaxPay(true)
      }
    } else {
      const cachedTreasuryMax = readCachedTreasuryMax(
        address,
        paymentMethod,
        walletChainId,
      )
      if (cachedTreasuryMax) {
        setMaxPayAmount(cachedTreasuryMax)
        setIsLoadingMaxPay(false)
      } else {
        setMaxPayAmount('')
        setIsLoadingMaxPay(true)
      }
    }

    async function loadMaxPay({ forceRefresh = false } = {}) {
      const chainId = walletChainIdRef.current
      try {
        let nextMax = ''

        if (paymentMethod === 'BNB') {
          const cachedBalance = forceRefresh
            ? null
            : getCachedSpendableBalance(
                address,
                paymentMethod,
                chainId,
                treasuryNetworkKey,
              )
          if (cachedBalance !== null) {
            nextMax = formatSpendableBalance(cachedBalance, paymentMethod)
          } else {
            const balance = await getSpendableBnbBalance(address, { bypassCache: forceRefresh })
            nextMax = formatSpendableBalance(balance, paymentMethod)
          }
        } else if (treasuryMethod) {
          const cachedTreasuryMax = forceRefresh
            ? ''
            : readCachedTreasuryMax(address, paymentMethod, chainId)
          if (cachedTreasuryMax) {
            nextMax = cachedTreasuryMax
          } else {
            const { balance } = await getBestTreasuryBalance(address, paymentMethod, chainId, {
              bypassCache: forceRefresh,
            })
            nextMax = formatSpendableBalance(balance, paymentMethod)
          }
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
  }, [address, enabled, maxPayReloadKey, paymentMethod, refreshKey, treasuryMethod])

  return {
    maxPayAmount,
    isLoadingMaxPay,
    refreshMaxPay,
    fetchMaxPayAmount,
  }
}
