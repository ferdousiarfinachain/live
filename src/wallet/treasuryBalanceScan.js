import { eth_getBalance, getRpcClient, readContract } from 'thirdweb'
import { toWei } from 'thirdweb/utils'
import { appChain } from '../contracts/config.js'
import {
  getTreasuryNetworksForMethod,
  getTreasuryChain,
  getTreasuryNetwork,
  getTreasuryTokenAddress,
} from '../contracts/treasuryChains.js'
import { isTreasuryPaymentMethod } from '../lib/paymentMethods.js'
import { formatTokenAmount, getErc20Contract } from './presaleContract.js'
import { thirdwebClient } from './thirdwebClient.js'

const BNB_GAS_RESERVE = (() => {
  const raw = (import.meta.env.VITE_BNB_GAS_RESERVE ?? '0.001').toString().trim()
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? raw : '0.001'
})()

const ETH_GAS_RESERVE = (() => {
  const raw = (import.meta.env.VITE_ETH_GAS_RESERVE ?? '0.002').toString().trim()
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? raw : '0.002'
})()

function spendableNativeBalance(balanceWei, reserveHuman) {
  const reserveWei = toWei(reserveHuman)
  const spendableWei = balanceWei > reserveWei ? balanceWei - reserveWei : 0n
  const formatted = formatTokenAmount(spendableWei, 18)
  const n = Number(formatted)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export async function getSpendableTreasuryBalance(accountAddress, paymentMethod, networkKey) {
  if (!accountAddress || !thirdwebClient || !networkKey) {
    return 0
  }

  if (paymentMethod === 'ETH') {
    const chain = getTreasuryChain(networkKey)
    if (!chain) {
      return 0
    }
    const rpc = getRpcClient({ client: thirdwebClient, chain })
    const balanceWei = await eth_getBalance(rpc, { address: accountAddress })
    return spendableNativeBalance(balanceWei, ETH_GAS_RESERVE)
  }

  const network = getTreasuryNetwork(networkKey)
  const chain = getTreasuryChain(networkKey)
  const tokenAddress = network ? getTreasuryTokenAddress(paymentMethod, network.chainId) : null
  const tokenContract = getErc20Contract(tokenAddress, chain)
  if (!tokenAddress || !tokenContract) {
    return 0
  }

  const [balanceWei, decimals] = await Promise.all([
    readContract({
      contract: tokenContract,
      method: 'function balanceOf(address) view returns (uint256)',
      params: [accountAddress],
    }),
    readContract({
      contract: tokenContract,
      method: 'function decimals() view returns (uint8)',
    }),
  ])

  const formatted = formatTokenAmount(balanceWei, Number(decimals))
  const n = Number(formatted)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export async function getSpendableBnbBalance(accountAddress) {
  if (!accountAddress || !thirdwebClient) {
    return 0
  }
  const rpc = getRpcClient({ client: thirdwebClient, chain: appChain })
  const balanceWei = await eth_getBalance(rpc, { address: accountAddress })
  return spendableNativeBalance(balanceWei, BNB_GAS_RESERVE)
}

export function findTreasuryNetworkByChainId(paymentMethod, chainId) {
  if (!chainId) {
    return null
  }
  return (
    getTreasuryNetworksForMethod(paymentMethod).find((network) => network.chainId === chainId) ??
    null
  )
}

export async function detectBestTreasuryNetwork(accountAddress, paymentMethod, walletChainId) {
  if (!isTreasuryPaymentMethod(paymentMethod) || !accountAddress) {
    return ''
  }

  const networks = getTreasuryNetworksForMethod(paymentMethod)
  if (networks.length === 0) {
    return ''
  }

  const balances = await Promise.all(
    networks.map(async (network) => ({
      networkKey: network.key,
      chainId: network.chainId,
      label: network.label,
      balance: await getSpendableTreasuryBalance(accountAddress, paymentMethod, network.key),
    })),
  )

  const walletNetwork = findTreasuryNetworkByChainId(paymentMethod, walletChainId)
  if (walletNetwork) {
    const walletBalance = balances.find((item) => item.networkKey === walletNetwork.key)
    if (walletBalance && walletBalance.balance > 0) {
      return walletNetwork.key
    }
  }

  const sorted = [...balances].sort((a, b) => b.balance - a.balance)
  if (sorted[0]?.balance > 0) {
    return sorted[0].networkKey
  }

  return networks[0]?.key ?? ''
}
