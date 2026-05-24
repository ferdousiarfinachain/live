import { useCallback, useEffect, useRef, useState } from 'react'
import { prepareContractCall, sendAndConfirmTransaction } from 'thirdweb'
import { readContract } from 'thirdweb'
import { useActiveAccount, useActiveWallet, useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react'
import { toWei } from 'thirdweb/utils'
import { isPresaleConfigured } from '../contracts/config.js'
import { ensureAppChain } from './useAutoSwitchChain.js'
import {
  formatTokenAmount,
  getErc20Contract,
  getPaymentTokenAddress,
  getPresaleContract,
  parseHumanAmount,
  quoteReceiveAmount,
  readPaymentTokenDecimals,
  readSaleTokenDecimals,
} from './presaleContract.js'

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
    return error.message || 'Wrong network. Approve BSC Testnet in your wallet.'
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
  if (message.includes('payment token address is missing') || message.includes('unsupported token')) {
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

export function usePresaleQuote(paymentMethod, payAmount, enabled = true) {
  const [quotedReceive, setQuotedReceive] = useState('')
  const [isQuoting, setIsQuoting] = useState(false)
  const prevMethodRef = useRef(paymentMethod)
  const prevAmountRef = useRef(payAmount)

  useEffect(() => {
    if (!enabled || !isPresaleConfigured) {
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
  }, [enabled, paymentMethod, payAmount])

  return { quotedReceive, isQuoting }
}

export function usePresaleBuy() {
  const account = useActiveAccount()
  const wallet = useActiveWallet()
  const walletChain = useActiveWalletChain()
  const switchChain = useSwitchActiveWalletChain()
  const [isBuying, setIsBuying] = useState(false)
  const [buyError, setBuyError] = useState('')

  const ensureChain = useCallback(async () => {
    await ensureAppChain({ wallet, walletChain, switchChain })
  }, [switchChain, wallet, walletChain?.id])

  const buy = useCallback(
    async ({ paymentMethod, amountHuman }) => {
      setBuyError('')
      if (!account) {
        throw new Error('Connect your wallet first.')
      }

      const presaleContract = getPresaleContract()
      if (!presaleContract) {
        throw new Error('Presale contract is not configured in .env')
      }

      setIsBuying(true)
      try {
        await ensureChain()

        const saleActive = await readContract({
          contract: presaleContract,
          method: 'function isSaleActive() view returns (bool)',
        })
        if (!saleActive) {
          throw new Error('Presale is not active right now.')
        }

        if (paymentMethod === 'BNB') {
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
          }
        }

        const paymentToken = getPaymentTokenAddress(paymentMethod)
        if (!paymentToken) {
          throw new Error(
            `${paymentMethod} payment token address is missing. Add VITE_PAYMENT_TOKEN_${paymentMethod} to .env`,
          )
        }

        const paymentDecimals = await readPaymentTokenDecimals(presaleContract, paymentToken)
        const amountWei = parseHumanAmount(amountHuman, paymentDecimals)
        const tokenContract = getErc20Contract(paymentToken)
        if (!tokenContract) {
          throw new Error('Payment token contract is not configured.')
        }

        const allowance = await readContract({
          contract: tokenContract,
          method: 'function allowance(address owner, address spender) view returns (uint256)',
          params: [account.address, presaleContract.address],
        })

        if (allowance < amountWei) {
          const approveTx = prepareContractCall({
            contract: tokenContract,
            method: 'function approve(address spender, uint256 amount)',
            params: [presaleContract.address, amountWei],
          })
          await sendAndConfirmTransaction({ account, transaction: approveTx })
        }

        const buyTx = prepareContractCall({
          contract: presaleContract,
          method: 'function buyWithToken(address paymentToken, uint256 amount)',
          params: [paymentToken, amountWei],
        })
        const receipt = await sendAndConfirmTransaction({ account, transaction: buyTx })
        return {
          transactionHash: receipt.transactionHash,
          paymentMethod,
          amountPaid: String(amountHuman).trim(),
        }
      } catch (error) {
        const message = formatBuyError(error)
        setBuyError(message)
        throw error
      } finally {
        setIsBuying(false)
      }
    },
    [account, ensureChain],
  )

  return {
    buy,
    isBuying,
    buyError,
    setBuyError,
    isPresaleConfigured,
  }
}
