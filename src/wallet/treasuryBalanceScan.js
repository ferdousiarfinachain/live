import { parseEther } from 'viem'
import { getBalance, readContract } from 'viem/actions'
import erc20Abi from '../contracts/abis/erc20.json'
import { appChain } from '../contracts/config.js'
import {
  getConfiguredTreasuryNetworks,
  getTreasuryChain,
  getTreasuryNetwork,
  getTreasuryTokenAddress,
  isTreasuryMethodConfigured,
} from '../contracts/treasuryChains.js'
import { isTreasuryPaymentMethod, TREASURY_PAYMENT_METHODS } from '../lib/paymentMethods.js'
import { isWalletConfigured } from './walletMetadata.js'
import { formatTokenAmount, getErc20Contract } from './presaleContract.js'
import { getDefaultAppRpc } from './chains.js'
import { getPublicClient } from './viemClients.js'

const BNB_GAS_RESERVE = '0.00005'
const ETH_GAS_RESERVE_BY_NETWORK = {
  ethereum: '0.00001',
  arbitrum: '0.0002',
  base: '0.0002',
  optimism: '0.0002',
}
const BALANCE_FETCH_TIMEOUT_MS = 2_500
const BALANCE_CACHE_TTL_MS = 12_000
const BSC_STABLECOIN_DECIMALS = 18
const bestTreasuryBalanceInFlight = new Map()
const spendableBalanceCache = new Map()
const spendableBalanceInFlight = new Map()

function withTimeout(promise, timeoutMs = BALANCE_FETCH_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('Balance fetch timed out')), timeoutMs)
    }),
  ])
}

function spendableNativeBalance(balanceWei, reserveHuman) {
  const reserveWei = parseEther(reserveHuman)
  const spendableWei = balanceWei > reserveWei ? balanceWei - reserveWei : 0n
  const formatted = formatTokenAmount(spendableWei, 18)
  const n = Number(formatted)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function ethGasReserveForNetwork(networkKey) {
  return ETH_GAS_RESERVE_BY_NETWORK[networkKey] ?? '0.0002'
}

function spendableCacheKey(accountAddress, paymentMethod, networkKey) {
  return `${accountAddress.toLowerCase()}|${paymentMethod}|${networkKey}`
}

function readSpendableCache(cacheKey) {
  const entry = spendableBalanceCache.get(cacheKey)
  if (!entry) {
    return null
  }
  if (Date.now() - entry.at > BALANCE_CACHE_TTL_MS) {
    spendableBalanceCache.delete(cacheKey)
    return null
  }
  return entry.value
}

function writeSpendableCache(cacheKey, value) {
  spendableBalanceCache.set(cacheKey, { value, at: Date.now() })
}

async function readErc20BalanceViaRpc(rpcUrl, tokenAddress, accountAddress) {
  const data = `0x70a08231${accountAddress.slice(2).toLowerCase().padStart(64, '0')}`
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: tokenAddress, data }, 'latest'],
    }),
  })
  const payload = await response.json()
  if (!payload?.result) {
    throw new Error('eth_call failed')
  }
  return BigInt(payload.result)
}

async function readTokenDecimals(tokenContract, networkKey) {
  if (networkKey === 'bsc') {
    return BSC_STABLECOIN_DECIMALS
  }
  const client = getPublicClient(tokenContract.chainId)
  return Number(
    await withTimeout(
      readContract(client, {
        address: tokenContract.address,
        abi: erc20Abi,
        functionName: 'decimals',
      }),
    ),
  )
}

async function fetchSpendableTreasuryBalance(accountAddress, paymentMethod, networkKey) {
  if (!accountAddress || !isWalletConfigured || !networkKey) {
    return 0
  }

  try {
    if (paymentMethod === 'ETH') {
      const chain = getTreasuryChain(networkKey)
      if (!chain) {
        return 0
      }
      const client = getPublicClient(chain.id)
      const balanceWei = await withTimeout(
        getBalance(client, { address: accountAddress }),
      )
      return spendableNativeBalance(balanceWei, ethGasReserveForNetwork(networkKey))
    }

    const network = getTreasuryNetwork(networkKey)
    const tokenAddress = network ? getTreasuryTokenAddress(paymentMethod, network.chainId) : null
    if (!tokenAddress) {
      return 0
    }

    if (networkKey === 'bsc') {
      const balanceWei = await withTimeout(
        readErc20BalanceViaRpc(getDefaultAppRpc(appChain), tokenAddress, accountAddress),
      )
      const formatted = formatTokenAmount(balanceWei, BSC_STABLECOIN_DECIMALS)
      const n = Number(formatted)
      return Number.isFinite(n) && n > 0 ? n : 0
    }

    const chain =
      network?.chainId === appChain.id ? appChain : getTreasuryChain(networkKey)
    const tokenContract = getErc20Contract(tokenAddress, chain)
    if (!tokenContract) {
      return 0
    }

    const client = getPublicClient(tokenContract.chainId)
    const [decimals, balanceWei] = await Promise.all([
      readTokenDecimals(tokenContract, networkKey),
      withTimeout(
        readContract(client, {
          address: tokenContract.address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [accountAddress],
        }),
      ),
    ])

    const formatted = formatTokenAmount(balanceWei, decimals)
    const n = Number(formatted)
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

async function getSpendableTreasuryBalance(accountAddress, paymentMethod, networkKey) {
  const cacheKey = spendableCacheKey(accountAddress, paymentMethod, networkKey)
  const cached = readSpendableCache(cacheKey)
  if (cached !== null) {
    return cached
  }

  const pending = spendableBalanceInFlight.get(cacheKey)
  if (pending) {
    return pending
  }

  const request = fetchSpendableTreasuryBalance(accountAddress, paymentMethod, networkKey)
  spendableBalanceInFlight.set(cacheKey, request)
  try {
    const value = await request
    if (value > 0) {
      writeSpendableCache(cacheKey, value)
    }
    return value
  } finally {
    spendableBalanceInFlight.delete(cacheKey)
  }
}

async function fetchSpendableBnbBalance(accountAddress) {
  if (!accountAddress || !isWalletConfigured) {
    return 0
  }
  const client = getPublicClient(appChain.id)
  const balanceWei = await withTimeout(getBalance(client, { address: accountAddress }))
  return spendableNativeBalance(balanceWei, BNB_GAS_RESERVE)
}

export async function getSpendableBnbBalance(accountAddress) {
  const cacheKey = spendableCacheKey(accountAddress, 'BNB', 'bsc')
  const cached = readSpendableCache(cacheKey)
  if (cached !== null) {
    return cached
  }

  const pending = spendableBalanceInFlight.get(cacheKey)
  if (pending) {
    return pending
  }

  const request = fetchSpendableBnbBalance(accountAddress)
  spendableBalanceInFlight.set(cacheKey, request)
  try {
    const value = await request
    if (value > 0) {
      writeSpendableCache(cacheKey, value)
    }
    return value
  } finally {
    spendableBalanceInFlight.delete(cacheKey)
  }
}

function getBestCachedSpendableBalance(accountAddress, paymentMethod) {
  const networks = getConfiguredTreasuryNetworks(paymentMethod)
  let bestBalance = null
  for (const network of networks) {
    const cached = readSpendableCache(
      spendableCacheKey(accountAddress, paymentMethod, network.key),
    )
    if (cached !== null && (bestBalance === null || cached > bestBalance)) {
      bestBalance = cached
    }
  }
  return bestBalance
}

export function getCachedSpendableBalance(
  accountAddress,
  paymentMethod,
  walletChainId,
  treasuryNetworkKey = '',
) {
  if (!accountAddress) {
    return null
  }
  if (paymentMethod === 'BNB') {
    return readSpendableCache(spendableCacheKey(accountAddress, 'BNB', 'bsc'))
  }
  if (!isTreasuryPaymentMethod(paymentMethod)) {
    return null
  }
  if (treasuryNetworkKey) {
    return readSpendableCache(
      spendableCacheKey(accountAddress, paymentMethod, treasuryNetworkKey),
    )
  }
  return getBestCachedSpendableBalance(accountAddress, paymentMethod)
}

export function getCachedBestTreasuryBalance(accountAddress, paymentMethod, walletChainId) {
  return getCachedSpendableBalance(accountAddress, paymentMethod, walletChainId)
}

export async function warmPaymentBalanceCache(accountAddress, walletChainId) {
  if (!accountAddress || !isWalletConfigured) {
    return
  }

  const tasks = [getSpendableBnbBalance(accountAddress)]

  for (const paymentMethod of TREASURY_PAYMENT_METHODS) {
    if (!isTreasuryMethodConfigured(paymentMethod)) {
      continue
    }
    tasks.push(getBestTreasuryBalance(accountAddress, paymentMethod, walletChainId))
  }

  await Promise.allSettled(tasks)
}

function findTreasuryNetworkByChainId(paymentMethod, chainId) {
  const normalizedChainId = Number(chainId)
  if (!Number.isFinite(normalizedChainId) || normalizedChainId <= 0) {
    return null
  }
  return (
    getConfiguredTreasuryNetworks(paymentMethod).find(
      (network) => Number(network.chainId) === normalizedChainId,
    ) ?? null
  )
}

async function scanTreasuryBalances(accountAddress, paymentMethod, networks) {
  const balanceResults = await Promise.allSettled(
    networks.map(async (network) => ({
      networkKey: network.key,
      balance: await getSpendableTreasuryBalance(accountAddress, paymentMethod, network.key),
    })),
  )

  return balanceResults.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    return { networkKey: networks[index].key, balance: 0 }
  })
}

function pickBestBalance(balances, walletNetwork) {
  const sorted = [...balances].sort((a, b) => {
    if (b.balance !== a.balance) {
      return b.balance - a.balance
    }
    if (walletNetwork) {
      if (a.networkKey === walletNetwork.key) {
        return -1
      }
      if (b.networkKey === walletNetwork.key) {
        return 1
      }
    }
    return 0
  })
  if (sorted[0]?.balance > 0) {
    return sorted[0]
  }

  return null
}

export async function detectBestTreasuryNetwork(accountAddress, paymentMethod, walletChainId) {
  const { networkKey } = await getBestTreasuryBalance(
    accountAddress,
    paymentMethod,
    walletChainId,
  )
  return networkKey
}

async function resolveBestTreasuryBalance(accountAddress, paymentMethod, walletChainId) {
  const networks = getConfiguredTreasuryNetworks(paymentMethod)
  if (networks.length === 0) {
    return { networkKey: '', balance: 0 }
  }

  const walletNetwork = findTreasuryNetworkByChainId(paymentMethod, walletChainId)
  const balances = await scanTreasuryBalances(accountAddress, paymentMethod, networks)
  const best = pickBestBalance(balances, walletNetwork)
  if (best) {
    return { networkKey: best.networkKey, balance: best.balance }
  }

  return { networkKey: networks[0]?.key ?? '', balance: 0 }
}

export async function getBestTreasuryBalance(accountAddress, paymentMethod, walletChainId) {
  if (!isTreasuryPaymentMethod(paymentMethod) || !accountAddress) {
    return { networkKey: '', balance: 0 }
  }

  const cacheKey = `${accountAddress}|${paymentMethod}|${walletChainId ?? ''}`
  const pending = bestTreasuryBalanceInFlight.get(cacheKey)
  if (pending) {
    return pending
  }

  const request = resolveBestTreasuryBalance(accountAddress, paymentMethod, walletChainId)
  bestTreasuryBalanceInFlight.set(cacheKey, request)
  try {
    return await request
  } finally {
    bestTreasuryBalanceInFlight.delete(cacheKey)
  }
}
