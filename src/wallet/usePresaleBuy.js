import { useCallback, useEffect, useRef, useState } from 'react'
import { parseEther } from 'viem'
import { readContract, waitForTransactionReceipt, writeContract } from 'wagmi/actions'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { appChain, isPresaleConfigured, presaleAbiExport } from '../contracts/config.js'
import { isTreasuryPaymentMethod } from '../lib/paymentMethods.js'
import { recordReferralCommission } from '../lib/referral.js'
import { estimateTreasuryTokens, estimateTreasuryTokensSync } from '../treasury/estimateTokens.js'
import { getCachedEthUsdPrice } from '../treasury/ethPrice.js'
import { payViaTreasury } from '../treasury/execute.js'
import { ensureAppChain } from './useAutoSwitchChain.js'
import { getPresaleContract, quoteReceiveAmount } from './presaleContract.js'
import { wagmiConfig } from './wagmiConfig.js'

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
  if (
    message.includes('connector not connected') ||
    message.includes('wallet not connected') ||
    message.includes('connect your wallet')
  ) {
    return 'Connect your wallet first.'
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
    message.includes('not configured') ||
    message.includes('not available yet')
  ) {
    return error.message || 'This payment method is not configured yet.'
  }
  if (message.includes('amount too small') || message.includes('no payment sent')) {
    return 'Enter a valid amount to pay.'
  }
  if (message.includes('execution reverted') || message.includes('revert')) {
    return 'Transaction failed. Please try again.'
  }

  return error.shortMessage || error.message || 'Purchase failed. Please try again.'
}

export function usePresaleQuote(
  paymentMethod,
  payAmount,
  enabled = true,
  { tokenPriceUsd = null, treasuryNetworkKey = '' } = {},
) {
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
      const syncQuote = estimateTreasuryTokensSync(paymentMethod, amount, {
        tokenPriceUsd,
        ethUsdPrice: getCachedEthUsdPrice(),
      })
      if (syncQuote) {
        setQuotedReceive(syncQuote)
        setIsQuoting(false)
        return undefined
      }

      let cancelled = false
      setIsQuoting(true)
      estimateTreasuryTokens(paymentMethod, amount, {
        tokenPriceUsd,
        treasuryNetworkKey,
      })
        .then((nextQuote) => {
          if (!cancelled) {
            setQuotedReceive(nextQuote)
          }
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
  }, [enabled, paymentMethod, payAmount, tokenPriceUsd, treasuryNetworkKey])

  return { quotedReceive, isQuoting }
}

export function usePresaleBuy() {
  const { address } = useAccount()
  const walletChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const [isBuying, setIsBuying] = useState(false)
  const [buyError, setBuyError] = useState('')

  useEffect(() => {
    if (!buyError) {
      return undefined
    }
    const timerId = window.setTimeout(() => setBuyError(''), 8000)
    return () => window.clearTimeout(timerId)
  }, [buyError])

  const ensureChain = useCallback(async () => {
    await ensureAppChain({ chainId: walletChainId, switchChain: switchChainAsync })
  }, [switchChainAsync, walletChainId])

  const buy = useCallback(
    async ({ paymentMethod, amountHuman, treasuryNetworkKey = '' }) => {
      setBuyError('')
      if (!address) {
        throw new Error('Connect your wallet first.')
      }

      if (isTreasuryPaymentMethod(paymentMethod)) {
        setIsBuying(true)
        try {
          return await payViaTreasury({
            paymentMethod,
            amountHuman,
            networkKey: treasuryNetworkKey,
            accountAddress: address,
            walletChainId,
            switchChain: switchChainAsync,
          })
        } catch (error) {
          const message = formatBuyError(error)
          setBuyError(message)
          throw error
        } finally {
          setIsBuying(false)
        }
      }

      setIsBuying(true)
      try {
        const presaleContract = getPresaleContract()
        if (!presaleContract) {
          throw new Error('Presale contract is not configured in .env')
        }

        await ensureChain()

        const saleActive = await readContract(wagmiConfig, {
          ...presaleContract,
          abi: presaleAbiExport,
          functionName: 'isSaleActive',
        })
        if (!saleActive) {
          throw new Error('Presale is not active right now.')
        }

        const hash = await writeContract(wagmiConfig, {
          ...presaleContract,
          abi: presaleAbiExport,
          functionName: 'buyWithBnb',
          value: parseEther(String(amountHuman).trim()),
        })
        const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
        const amountPaid = String(amountHuman).trim()
        try {
          await recordReferralCommission({
            walletAddress: address,
            amountPaid,
            chainLabel: paymentMethod,
            networkKey: 'bsc',
          })
        } catch {
          /* referral logging must not block payment success */
        }
        return {
          transactionHash: receipt.transactionHash,
          paymentMethod,
          amountPaid,
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
    [address, ensureChain, switchChainAsync, walletChainId],
  )

  return {
    buy,
    isBuying,
    buyError,
    setBuyError,
    isPresaleConfigured,
  }
}
