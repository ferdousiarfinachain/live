import { useCallback, useEffect, useRef, useState } from 'react'
import { prepareContractCall, sendAndConfirmTransaction } from 'thirdweb'
import { readContract } from 'thirdweb'
import { useActiveAccount, useActiveWallet, useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react'
import { toWei } from 'thirdweb/utils'
import { appChain, isPresaleConfigured } from '../contracts/config.js'
import { isTreasuryPaymentMethod } from '../lib/paymentMethods.js'
import { fetchEthUsdPrice } from '../lib/chainlinkEthPrice.js'
import { estimateTokensFromTreasuryPayment } from '../lib/presaleEstimate.js'
import { ensureAppChain } from './useAutoSwitchChain.js'
import {
  getPresaleContract,
  quoteReceiveAmount,
  readPresaleTokenPriceUsd,
} from './presaleContract.js'
import { payViaTreasury } from './treasuryPayment.js'

function formatBuyError(error) {
  if (!error) return 'Purchase failed. Please try again.'

  const raw = [
    error.shortMessage,
    error.message,
    error.reason,
    error.details,
    error.cause?.message,
    typeof error.data === 'string' ? error.data : '',
    String(error),
  ]
    .filter(Boolean)
    .join(' ')

  const message = raw.toLowerCase()

  if (message.includes('user rejected') || message.includes('user denied')) {
    return 'Transaction cancelled in wallet.'
  }
  if (message.includes('sale not active')) {
    return 'Presale is not active right now.'
  }
  if (
    message.includes('wrong network') ||
    message.includes('unsupported chain') ||
    message.includes('chain mismatch') ||
    message.includes('switch to') ||
    message.includes('approve the switch') ||
    message.includes('sepolia')
  ) {
    return error.message || 'Wrong network. Approve the required network in your wallet.'
  }
  if (
    message.includes('insufficient funds') ||
    message.includes('insufficient balance') ||
    message.includes('have 0 want') ||
    message.includes('exceeds balance') ||
    message.includes('transfer amount exceeds balance')
  ) {
    return 'Insufficient funds.'
  }
  if (
    message.includes('payment token address is missing') ||
    message.includes('unsupported token') ||
    message.includes('not configured')
  ) {
    return 'This payment method is not configured yet.'
  }
  if (message.includes('amount too small') || message.includes('no payment sent')) {
    return 'Enter a valid amount to pay.'
  }
  if (message.includes('execution reverted') || message.includes('revert')) {
    return 'Transaction failed. Please try again.'
  }

  return 'Purchase failed. Please try again.'
}

export function usePresaleQuote(paymentMethod, payAmount, enabled = true, treasuryNetworkKey = '') {
  const [quotedReceive, setQuotedReceive] = useState('')
  const [isQuoting, setIsQuoting] = useState(false)
  const prevMethodRef = useRef(paymentMethod)
  const prevAmountRef = useRef(payAmount)

  useEffect(() => {
    if (!enabled) {
      setQuotedReceive('')
      setIsQuoting(false)
      return undefined
    }

    const amount = String(payAmount ?? '').trim()
    if (!amount || Number(amount) <= 0) {
      setQuotedReceive('')
      setIsQuoting(false)
      return undefined
    }

    if (isTreasuryPaymentMethod(paymentMethod)) {
      let cancelled = false
      setIsQuoting(true)

      const ethPricePromise =
        paymentMethod === 'ETH' && treasuryNetworkKey
          ? fetchEthUsdPrice(treasuryNetworkKey)
          : Promise.resolve(null)

      Promise.all([ethPricePromise, readPresaleTokenPriceUsd()])
        .then(([ethUsdPrice, tokenPriceUsd]) => {
          if (cancelled) {
            return
          }
          setQuotedReceive(
            estimateTokensFromTreasuryPayment(paymentMethod, amount, {
              ethUsdPrice,
              tokenPriceUsd,
            }),
          )
        })
        .catch(() => {
          if (!cancelled) {
            setQuotedReceive('')
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsQuoting(false)
          }
        })

      return () => {
        cancelled = true
      }
    }

    if (!isPresaleConfigured) {
      setQuotedReceive('')
      setIsQuoting(false)
      return undefined
    }

    const methodChanged = prevMethodRef.current !== paymentMethod
    prevMethodRef.current = paymentMethod
    prevAmountRef.current = payAmount
    const delay = methodChanged ? 0 : 200

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setIsQuoting(true)
      try {
        const nextQuote = await quoteReceiveAmount(paymentMethod, amount)
        if (!cancelled) {
          setQuotedReceive(nextQuote)
        }
      } catch {
        if (!cancelled) {
          setQuotedReceive('')
        }
      } finally {
        if (!cancelled) {
          setIsQuoting(false)
        }
      }
    }, delay)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [enabled, paymentMethod, payAmount, treasuryNetworkKey])

  return { quotedReceive, isQuoting }
}

export function usePresaleBuy() {
  const account = useActiveAccount()
  const wallet = useActiveWallet()
  const walletChain = useActiveWalletChain()
  const switchChain = useSwitchActiveWalletChain()
  const [isBuying, setIsBuying] = useState(false)
  const [buyError, setBuyError] = useState('')

  useEffect(() => {
    if (!buyError) {
      return undefined
    }
    const timerId = window.setTimeout(() => setBuyError(''), 2000)
    return () => window.clearTimeout(timerId)
  }, [buyError])

  const ensureChain = useCallback(async () => {
    await ensureAppChain({ wallet, walletChain, switchChain })
  }, [switchChain, wallet, walletChain?.id])

  const buy = useCallback(
    async ({ paymentMethod, amountHuman, treasuryNetworkKey = '' }) => {
      setBuyError('')
      if (!account) {
        throw new Error('Connect your wallet first.')
      }

      setIsBuying(true)
      try {
        if (isTreasuryPaymentMethod(paymentMethod)) {
          return payViaTreasury({
            account,
            wallet,
            walletChain,
            switchChain,
            paymentMethod,
            treasuryNetworkKey,
            amountHuman,
          })
        }

        const presaleContract = getPresaleContract()
        if (!presaleContract) {
          throw new Error('Presale contract is not configured in .env')
        }

        await ensureChain()

        const saleActive = await readContract({
          contract: presaleContract,
          method: 'function isSaleActive() view returns (bool)',
        })
        if (!saleActive) {
          throw new Error('Presale is not active right now.')
        }

        const tx = prepareContractCall({
          contract: presaleContract,
          method: 'function buyWithBnb()',
          params: [],
          value: toWei(String(amountHuman).trim()),
        })
        const receipt = await sendAndConfirmTransaction({ account, transaction: tx })
        return {
          transactionHash: receipt.transactionHash,
          paymentMethod,
          amountPaid: String(amountHuman).trim(),
          chainId: appChain.id,
        }
      } catch (error) {
        const message = formatBuyError(error)
        setBuyError(message)
        throw error
      } finally {
        setIsBuying(false)
      }
    },
    [account, ensureChain, switchChain, wallet, walletChain],
  )

  return {
    buy,
    isBuying,
    buyError,
    setBuyError,
    isPresaleConfigured,
  }
}
