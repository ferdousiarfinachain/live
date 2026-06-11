import { useCallback, useEffect, useState } from 'react'
import { readContract, waitForTransactionReceipt, writeContract } from 'wagmi/actions'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { isPresaleConfigured, presaleAbiExport } from '../contracts/config.js'
import { ensureAppChain } from './useAutoSwitchChain.js'
import {
  formatTokenAmount,
  getPresaleContract,
  readSaleTokenDecimals,
} from './presaleContract.js'
import { wagmiConfig } from './wagmiConfig.js'

function formatClaimAmount(amountWei, decimals) {
  if (!amountWei || amountWei <= 0n) {
    return '0'
  }
  const raw = formatTokenAmount(amountWei, decimals)
  const n = Number(raw)
  if (!Number.isFinite(n)) {
    return raw
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(n)
}

function formatClaimError(error) {
  if (!error) return 'Claim failed. Please try again.'

  const raw = [
    error.shortMessage,
    error.message,
    error.reason,
    error.cause?.message,
    String(error),
  ]
    .filter(Boolean)
    .join(' ')
  const message = raw.toLowerCase()

  if (message.includes('user rejected') || message.includes('user denied')) {
    return 'Transaction cancelled in wallet.'
  }
  if (message.includes('claim not started')) {
    return 'Claim has not started yet.'
  }
  if (message.includes('nothing to claim')) {
    return 'Nothing to claim for this wallet.'
  }
  if (
    message.includes('wrong network') ||
    message.includes('chain mismatch') ||
    message.includes('switch to')
  ) {
    return error.message || 'Wrong network. Switch to BSC Testnet in your wallet.'
  }
  return 'Claim failed. Please try again.'
}

export function usePresaleClaim(enabled = true) {
  const { address } = useAccount()
  const walletChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  const [purchasedDisplay, setPurchasedDisplay] = useState('0')
  const [claimableDisplay, setClaimableDisplay] = useState('0')
  const [claimedDisplay, setClaimedDisplay] = useState('0')
  const [claimableWei, setClaimableWei] = useState(0n)
  const [saleFinalized, setSaleFinalized] = useState(false)
  const [claimStarted, setClaimStarted] = useState(false)
  const [tokenAddress, setTokenAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimError, setClaimError] = useState('')

  useEffect(() => {
    if (!claimError) {
      return undefined
    }
    const timerId = window.setTimeout(() => setClaimError(''), 2000)
    return () => window.clearTimeout(timerId)
  }, [claimError])

  const refresh = useCallback(async () => {
    if (!enabled || !isPresaleConfigured) {
      setPurchasedDisplay('0')
      setClaimableDisplay('0')
      setClaimedDisplay('0')
      setClaimableWei(0n)
      setSaleFinalized(false)
      setClaimStarted(false)
      setTokenAddress('')
      setIsLoading(false)
      return
    }

    const presaleContract = getPresaleContract()
    if (!presaleContract) {
      return
    }

    setIsLoading(true)
    try {
      const nowSec = Math.floor(Date.now() / 1000)
      const [finalized, tgeTime, saleToken, saleTokenDecimals] = await Promise.all([
        readContract(wagmiConfig, {
          ...presaleContract,
          abi: presaleAbiExport,
          functionName: 'saleFinalized',
        }),
        readContract(wagmiConfig, {
          ...presaleContract,
          abi: presaleAbiExport,
          functionName: 'tgeTime',
        }),
        readContract(wagmiConfig, {
          ...presaleContract,
          abi: presaleAbiExport,
          functionName: 'token',
        }),
        readSaleTokenDecimals(presaleContract),
      ])

      const tgeSec = Number(tgeTime)
      setSaleFinalized(Boolean(finalized))
      setClaimStarted(tgeSec > 0 && nowSec >= tgeSec)
      setTokenAddress(String(saleToken))

      if (!address) {
        setPurchasedDisplay('0')
        setClaimableDisplay('0')
        setClaimedDisplay('0')
        setClaimableWei(0n)
        return
      }

      const [purchasedWei, claimableAmountWei, claimedWei] = await Promise.all([
        readContract(wagmiConfig, {
          ...presaleContract,
          abi: presaleAbiExport,
          functionName: 'purchasedBy',
          args: [address],
        }),
        readContract(wagmiConfig, {
          ...presaleContract,
          abi: presaleAbiExport,
          functionName: 'claimableBy',
          args: [address],
        }),
        readContract(wagmiConfig, {
          ...presaleContract,
          abi: presaleAbiExport,
          functionName: 'claimedBy',
          args: [address],
        }),
      ])

      setPurchasedDisplay(formatClaimAmount(purchasedWei, saleTokenDecimals))
      setClaimableDisplay(formatClaimAmount(claimableAmountWei, saleTokenDecimals))
      setClaimedDisplay(formatClaimAmount(claimedWei, saleTokenDecimals))
      setClaimableWei(claimableAmountWei)
    } catch {
      setPurchasedDisplay('0')
      setClaimableDisplay('0')
      setClaimedDisplay('0')
      setClaimableWei(0n)
    } finally {
      setIsLoading(false)
    }
  }, [address, enabled])

  useEffect(() => {
    refresh()
  }, [refresh])

  const claim = useCallback(async () => {
    setClaimError('')
    if (!address) {
      throw new Error('Connect your wallet first.')
    }
    if (claimableWei <= 0n) {
      throw new Error('Nothing to claim for this wallet.')
    }

    const presaleContract = getPresaleContract()
    if (!presaleContract) {
      throw new Error('Presale contract is not configured.')
    }

    setIsClaiming(true)
    try {
      await ensureAppChain({ chainId: walletChainId, switchChain: switchChainAsync })

      const hash = await writeContract(wagmiConfig, {
        ...presaleContract,
        abi: presaleAbiExport,
        functionName: 'claim',
      })
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
      await refresh()
      return { transactionHash: receipt.transactionHash }
    } catch (error) {
      const message = formatClaimError(error)
      setClaimError(message)
      throw error
    } finally {
      setIsClaiming(false)
    }
  }, [address, claimableWei, refresh, switchChainAsync, walletChainId])

  const canClaim =
    Boolean(address) &&
    saleFinalized &&
    claimStarted &&
    claimableWei > 0n &&
    !isLoading &&
    !isClaiming

  return {
    purchasedDisplay,
    claimableDisplay,
    claimedDisplay,
    saleFinalized,
    claimStarted,
    tokenAddress,
    isLoading,
    isClaiming,
    claimError,
    canClaim,
    claim,
    refresh,
    isPresaleConfigured,
  }
}
