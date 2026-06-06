import { useCallback, useEffect, useState } from 'react'
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react'
import { appChain, isPresaleConfigured } from '../contracts/config.js'
import { isTreasuryMethodConfigured } from '../contracts/treasuryChains.js'
import { isTreasuryPaymentMethod } from '../lib/paymentMethods.js'
import {
  getBestTreasuryBalance,
  getCachedSpendableBalance,
  getSpendableBnbBalance,
  getSpendableTreasuryBalance,
  warmPaymentBalanceCache,
} from './treasuryBalanceScan.js'
import { thirdwebClient } from './thirdwebClient.js'

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
  return String(Number(amount.toFixed(precision)))
}

export function usePaymentBalance(paymentMethod, treasuryNetworkKey = '', enabled = true) {
  const account = useActiveAccount()
  const walletChain = useActiveWalletChain()
  const [maxPayAmount, setMaxPayAmount] = useState('')
  const [isLoadingMaxPay, setIsLoadingMaxPay] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshMaxPay = useCallback(() => {
    setRefreshKey((value) => value + 1)
  }, [])

  const fetchMaxPayAmount = useCallback(async () => {
    if (!account?.address || !thirdwebClient) {
      return ''
    }

    const treasuryMethod = isTreasuryPaymentMethod(paymentMethod)
    const methodReady = treasuryMethod
      ? isTreasuryMethodConfigured(paymentMethod)
      : isPresaleConfigured
    if (!methodReady) {
      return ''
    }

    const cachedBalance = getCachedSpendableBalance(
      account.address,
      paymentMethod,
      walletChain?.id,
    )
    if (cachedBalance !== null) {
      return formatSpendableBalance(cachedBalance, paymentMethod)
    }

    try {
      if (paymentMethod === 'BNB') {
        const balance = await getSpendableBnbBalance(account.address)
        return formatSpendableBalance(balance, paymentMethod)
      }
      if (treasuryMethod && Number(walletChain?.id) === appChain.id) {
        const balance = await getSpendableTreasuryBalance(
          account.address,
          paymentMethod,
          'bsc',
        )
        return formatSpendableBalance(balance, paymentMethod)
      }
      if (treasuryMethod) {
        const { balance } = await getBestTreasuryBalance(
          account.address,
          paymentMethod,
          walletChain?.id,
        )
        return formatSpendableBalance(balance, paymentMethod)
      }
    } catch {
      return ''
    }

    return ''
  }, [account?.address, paymentMethod, walletChain?.id])

  useEffect(() => {
    if (!enabled || !account?.address || !thirdwebClient) {
      return undefined
    }

    void warmPaymentBalanceCache(account.address, walletChain?.id)
    return undefined
  }, [account?.address, enabled, walletChain?.id])

  useEffect(() => {
    const treasuryMethod = isTreasuryPaymentMethod(paymentMethod)
    const methodReady = treasuryMethod
      ? isTreasuryMethodConfigured(paymentMethod)
      : isPresaleConfigured

    if (!enabled || !account?.address || !thirdwebClient || !methodReady) {
      setMaxPayAmount('')
      setIsLoadingMaxPay(false)
      return undefined
    }

    let cancelled = false
    setMaxPayAmount('')
    setIsLoadingMaxPay(true)

    async function loadMaxPay() {
      try {
        let nextMax = ''

        const cachedBalance = getCachedSpendableBalance(
          account.address,
          paymentMethod,
          walletChain?.id,
        )
        if (cachedBalance !== null) {
          nextMax = formatSpendableBalance(cachedBalance, paymentMethod)
        } else if (paymentMethod === 'BNB') {
          const balance = await getSpendableBnbBalance(account.address)
          nextMax = formatSpendableBalance(balance, paymentMethod)
        } else if (treasuryMethod && Number(walletChain?.id) === appChain.id) {
          const balance = await getSpendableTreasuryBalance(
            account.address,
            paymentMethod,
            'bsc',
          )
          nextMax = formatSpendableBalance(balance, paymentMethod)
        } else if (treasuryMethod) {
          const { balance } = await getBestTreasuryBalance(
            account.address,
            paymentMethod,
            walletChain?.id,
          )
          nextMax = formatSpendableBalance(balance, paymentMethod)
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
    const timer = window.setInterval(loadMaxPay, 15_000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      setIsLoadingMaxPay(false)
    }
  }, [account?.address, enabled, paymentMethod, refreshKey, treasuryNetworkKey, walletChain?.id])

  return {
    maxPayAmount,
    isLoadingMaxPay,
    refreshMaxPay,
    fetchMaxPayAmount,
  }
}
