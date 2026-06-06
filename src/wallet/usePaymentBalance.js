import { useCallback, useEffect, useState } from 'react'
import { eth_getBalance, getRpcClient, readContract } from 'thirdweb'
import { useActiveAccount } from 'thirdweb/react'
import { toWei } from 'thirdweb/utils'
import { appChain, isPresaleConfigured, isTreasuryRouteConfigured } from '../contracts/config.js'
import {
  getTreasuryChain,
  getTreasuryNetwork,
  getTreasuryTokenAddress,
} from '../contracts/treasuryChains.js'
import { isTreasuryPaymentMethod } from '../lib/paymentMethods.js'
import {
  formatTokenAmount,
  getErc20Contract,
  getPaymentTokenAddress,
  getPresaleContract,
  readPaymentTokenDecimals,
} from './presaleContract.js'
import { thirdwebClient } from './thirdwebClient.js'

const BNB_GAS_RESERVE = '0.001'
const ETH_GAS_RESERVE = '0.002'

function formatMaxInput(amountWei, decimals) {
  if (!amountWei || amountWei <= 0n) {
    return ''
  }
  const raw = formatTokenAmount(amountWei, decimals)
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) {
    return ''
  }
  const precision = paymentMethodPrecision(decimals)
  return String(Number(n.toFixed(precision)))
}

function paymentMethodPrecision(decimals) {
  return Math.min(8, Math.max(2, decimals))
}

export function usePaymentBalance(paymentMethod, treasuryNetworkKey = '', enabled = true) {
  const account = useActiveAccount()
  const [maxPayAmount, setMaxPayAmount] = useState('')
  const [isLoadingMaxPay, setIsLoadingMaxPay] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshMaxPay = useCallback(() => {
    setRefreshKey((value) => value + 1)
  }, [])

  useEffect(() => {
    const treasuryMethod = isTreasuryPaymentMethod(paymentMethod)
    const methodReady = treasuryMethod
      ? isTreasuryRouteConfigured(paymentMethod, treasuryNetworkKey)
      : isPresaleConfigured

    if (!enabled || !account?.address || !thirdwebClient || !methodReady) {
      setMaxPayAmount('')
      setIsLoadingMaxPay(false)
      return undefined
    }

    let cancelled = false
    setIsLoadingMaxPay(true)

    async function loadMaxPay() {
      try {
        let nextMax = ''

        if (paymentMethod === 'BNB') {
          const rpc = getRpcClient({ client: thirdwebClient, chain: appChain })
          const balanceWei = await eth_getBalance(rpc, { address: account.address })
          const reserveWei = toWei(BNB_GAS_RESERVE)
          const spendableWei = balanceWei > reserveWei ? balanceWei - reserveWei : 0n
          nextMax = formatMaxInput(spendableWei, 18)
        } else if (paymentMethod === 'ETH') {
          const paymentChain = getTreasuryChain(treasuryNetworkKey)
          if (!paymentChain) {
            nextMax = ''
          } else {
            const rpc = getRpcClient({ client: thirdwebClient, chain: paymentChain })
            const balanceWei = await eth_getBalance(rpc, { address: account.address })
            const reserveWei = toWei(ETH_GAS_RESERVE)
            const spendableWei = balanceWei > reserveWei ? balanceWei - reserveWei : 0n
            nextMax = formatMaxInput(spendableWei, 18)
          }
        } else if (treasuryMethod) {
          const network = getTreasuryNetwork(treasuryNetworkKey)
          const paymentChain = getTreasuryChain(treasuryNetworkKey)
          const tokenAddress = network
            ? getTreasuryTokenAddress(paymentMethod, network.chainId)
            : null
          const tokenContract = getErc20Contract(tokenAddress, paymentChain)
          if (!tokenAddress || !tokenContract) {
            nextMax = ''
          } else {
            const [balanceWei, decimals] = await Promise.all([
              readContract({
                contract: tokenContract,
                method: 'function balanceOf(address) view returns (uint256)',
                params: [account.address],
              }),
              readContract({
                contract: tokenContract,
                method: 'function decimals() view returns (uint8)',
              }),
            ])
            nextMax = formatMaxInput(balanceWei, Number(decimals))
          }
        } else {
          const tokenAddress = getPaymentTokenAddress(paymentMethod)
          const tokenContract = getErc20Contract(tokenAddress, appChain)
          if (!tokenAddress || !tokenContract) {
            nextMax = ''
          } else {
            const presaleContract = getPresaleContract()
            if (!presaleContract) {
              nextMax = ''
            } else {
              const [balanceWei, decimals] = await Promise.all([
                readContract({
                  contract: tokenContract,
                  method: 'function balanceOf(address) view returns (uint256)',
                  params: [account.address],
                }),
                readPaymentTokenDecimals(presaleContract, tokenAddress),
              ])
              nextMax = formatMaxInput(balanceWei, decimals)
            }
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
    const timer = window.setInterval(loadMaxPay, 15_000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [account?.address, enabled, paymentMethod, refreshKey, treasuryNetworkKey])

  return {
    maxPayAmount,
    isLoadingMaxPay,
    refreshMaxPay,
  }
}
